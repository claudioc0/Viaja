import React from 'react';
import { NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import {
  type PublicUserDto,
  redactSensitiveText,
  sanitizeSentryEvent,
  sanitizeTelemetryData,
} from '@viaja/shared';
import { colors, radii, spacing } from '../utils/theme';

export interface CrashlyticsAdapter {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void> | void;
  setUserId: (userId: string) => Promise<void> | void;
  setAttributes: (attributes: Record<string, string>) => Promise<void> | void;
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  crash: () => void;
}

export interface DiagnosticTelemetryRecord {
  timestamp: string;
  channel: 'sentry' | 'crashlytics' | 'diagnostic-fallback';
  type: 'error' | 'breadcrumb' | 'user';
  summary: string;
  metadata?: Record<string, unknown>;
}

const MAX_DIAGNOSTIC_BUFFER = 25;
const diagnosticBuffer: DiagnosticTelemetryRecord[] = [];

let sentryInitialized = false;
let customCrashlyticsAdapter: CrashlyticsAdapter | null = null;

function pushDiagnosticRecord(record: DiagnosticTelemetryRecord): void {
  diagnosticBuffer.unshift(record);
  if (diagnosticBuffer.length > MAX_DIAGNOSTIC_BUFFER) {
    diagnosticBuffer.pop();
  }
}

export function getMobileDiagnosticEvents(): readonly DiagnosticTelemetryRecord[] {
  return diagnosticBuffer;
}

export function clearMobileDiagnosticEvents(): void {
  diagnosticBuffer.length = 0;
}

export function setCrashlyticsAdapterForTesting(adapter: CrashlyticsAdapter | null): void {
  customCrashlyticsAdapter = adapter;
}

function resolveCrashlytics(): CrashlyticsAdapter | null {
  if (customCrashlyticsAdapter) {
    return customCrashlyticsAdapter;
  }

  // Native module is only present in EAS development/preview/production builds (not Expo Go / Jest)
  const hasNativeCrashlytics = Boolean(
    (NativeModules as Record<string, unknown> | undefined)?.RNFBCrashlyticsModule,
  );
  if (!hasNativeCrashlytics) {
    return null;
  }

  try {
    // Dynamic require avoids crashing JS-only runtimes (Expo Go / unit test runners)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crashlyticsModule = require('@react-native-firebase/crashlytics') as {
      default?: () => CrashlyticsAdapter;
    };
    return typeof crashlyticsModule.default === 'function' ? crashlyticsModule.default() : null;
  } catch {
    return null;
  }
}

export function initMobileMonitoring(): {
  sentryEnabled: boolean;
  crashlyticsNativeAvailable: boolean;
} {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';
  const appEnv =
    process.env.EXPO_PUBLIC_APP_ENV?.trim() || (__DEV__ ? 'development' : 'production');

  if (!sentryInitialized && dsn) {
    Sentry.init({
      dsn,
      environment: appEnv,
      enableAutoSessionTracking: true,
      tracesSampleRate: appEnv === 'production' ? 0.2 : 1.0,
      beforeSend(event) {
        return sanitizeSentryEvent(event);
      },
    });
    sentryInitialized = true;
  }

  const crashlytics = resolveCrashlytics();
  const crashlyticsEnabledFlag = process.env.EXPO_PUBLIC_ENABLE_CRASHLYTICS !== 'false';
  if (crashlytics && crashlyticsEnabledFlag) {
    void crashlytics.setCrashlyticsCollectionEnabled(true);
  }

  return {
    sentryEnabled: sentryInitialized,
    crashlyticsNativeAvailable: Boolean(crashlytics),
  };
}

export function setMobileMonitoringUser(user: Pick<PublicUserDto, 'id' | 'role'> | null): void {
  if (sentryInitialized) {
    if (!user) {
      Sentry.setUser(null);
    } else {
      // Explicitly omit email, name and tokens
      Sentry.setUser({ id: user.id, role: user.role });
    }
  }

  const crashlytics = resolveCrashlytics();
  if (crashlytics) {
    if (!user) {
      void crashlytics.setUserId('');
      void crashlytics.setAttributes({ role: 'anonymous' });
    } else {
      void crashlytics.setUserId(user.id);
      void crashlytics.setAttributes({ role: user.role });
    }
  }

  pushDiagnosticRecord({
    timestamp: new Date().toISOString(),
    channel: crashlytics ? 'crashlytics' : sentryInitialized ? 'sentry' : 'diagnostic-fallback',
    type: 'user',
    summary: user ? `Contexto atribuído (${user.role})` : 'Contexto de usuário limpo',
    metadata: user ? { userId: user.id, role: user.role } : undefined,
  });
}

export function recordMobileBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  const safeMessage = redactSensitiveText(message);
  const safeData = data ? sanitizeTelemetryData(data) : undefined;

  if (sentryInitialized) {
    Sentry.addBreadcrumb({
      category,
      message: safeMessage,
      level,
      ...(safeData ? { data: safeData } : {}),
    });
  }

  const crashlytics = resolveCrashlytics();
  if (crashlytics) {
    crashlytics.log(`[${category}] ${safeMessage}`);
  }

  pushDiagnosticRecord({
    timestamp: new Date().toISOString(),
    channel: crashlytics ? 'crashlytics' : sentryInitialized ? 'sentry' : 'diagnostic-fallback',
    type: 'breadcrumb',
    summary: `[${category}] ${safeMessage}`,
    metadata: safeData,
  });
}

export function recordMobileError(
  error: unknown,
  context?: Record<string, unknown>,
): { sentryCaptured: boolean; crashlyticsCaptured: boolean } {
  const normalizedError =
    error instanceof Error
      ? new Error(redactSensitiveText(error.message))
      : new Error(redactSensitiveText(String(error)));

  if (error instanceof Error && error.stack) {
    normalizedError.name = error.name;
    normalizedError.stack = redactSensitiveText(error.stack);
  }

  const safeContext = context ? sanitizeTelemetryData(context) : undefined;

  if (sentryInitialized) {
    Sentry.withScope((scope) => {
      if (safeContext) {
        scope.setExtras(safeContext);
      }
      Sentry.captureException(normalizedError);
    });
  }

  const crashlytics = resolveCrashlytics();
  if (crashlytics) {
    if (safeContext) {
      const stringAttributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(safeContext)) {
        if (value !== undefined && value !== null) {
          stringAttributes[key] = String(value).slice(0, 100);
        }
      }
      void crashlytics.setAttributes(stringAttributes);
    }
    crashlytics.recordError(normalizedError, normalizedError.name);
  }

  pushDiagnosticRecord({
    timestamp: new Date().toISOString(),
    channel: crashlytics ? 'crashlytics' : sentryInitialized ? 'sentry' : 'diagnostic-fallback',
    type: 'error',
    summary: `${normalizedError.name}: ${normalizedError.message}`,
    metadata: safeContext,
  });

  return {
    sentryCaptured: sentryInitialized,
    crashlyticsCaptured: Boolean(crashlytics),
  };
}

/**
 * Validates failure capture in development and internal test builds (EAS preview / dev-client).
 */
export function runMonitoringDiagnosticCheck(mode: 'non_fatal' | 'native_crash' = 'non_fatal'): {
  sentryCaptured: boolean;
  crashlyticsCaptured: boolean;
  eventsRecorded: number;
} {
  recordMobileBreadcrumb('diagnostics', `Iniciando verificação de telemetria (${mode})`, {
    mode,
    token: 'should-be-redacted',
  });

  if (mode === 'native_crash') {
    const crashlytics = resolveCrashlytics();
    if (crashlytics) {
      crashlytics.crash();
    }
  }

  const diagnosticError = new Error('VIAJA Diagnostic Test Exception (Simulated Non-Fatal)');
  diagnosticError.name = 'ViajaMonitoringDiagnosticError';

  const result = recordMobileError(diagnosticError, {
    diagnostic: true,
    mode,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  });

  return {
    ...result,
    eventsRecorded: diagnosticBuffer.length,
  };
}

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

export class MobileErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  public override state: BoundaryState = { hasError: false };

  public static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    recordMobileError(error, {
      boundary: 'MobileErrorBoundary',
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="mobile-error-boundary">
          <View style={styles.card}>
            <Text style={styles.title}>Ocorreu uma falha inesperada</Text>
            <Text style={styles.description}>
              O relatório técnico foi capturado com segurança para análise (sem expor senhas ou
              tokens).
            </Text>
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonLabel}>Recarregar tela</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
