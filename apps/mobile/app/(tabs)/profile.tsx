import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { runMonitoringDiagnosticCheck } from '../../src/services/monitoring';
import { useAuthStore } from '../../src/stores/auth-store';
import { colors, radii, spacing } from '../../src/utils/theme';

const IS_NON_PROD =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_APP_ENV !== 'production';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [loggingOut, setLoggingOut] = useState(false);
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDiagnosticTest = () => {
    const result = runMonitoringDiagnosticCheck('non_fatal');
    setDiagnosticFeedback(
      `Falha simulada validada (${result.eventsRecorded} evento(s) sanitizado(s) · Sentry: ${
        result.sentryCaptured ? 'ativo' : 'standby'
      } · Crashlytics: ${result.crashlyticsCaptured ? 'nativo' : 'buffer dev'}).`,
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>

        <Text style={styles.nameText}>{user?.name ?? 'Passageiro'}</Text>
        <Text style={styles.emailText}>{user?.email}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Perfil: {user?.role ?? 'PASSENGER'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Segurança da Sessão</Text>
        <Text style={styles.helperText}>
          Suas credenciais são protegidas via armazenamento criptografado do dispositivo
          (SecureStore) com renovação automática de tokens JWT.
        </Text>
        <Button
          title="Sair da conta"
          variant="danger"
          loading={loggingOut}
          onPress={handleLogout}
        />
      </View>

      {IS_NON_PROD ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Diagnóstico de Monitoramento (Dev / Preview)</Text>
          <Text style={styles.helperText}>
            Dispara uma exceção não-fatal sanitizada para validar a captura no Sentry e no Firebase
            Crashlytics em builds de desenvolvimento e distribuição de testes.
          </Text>
          <Button
            title="Testar captura de falha"
            variant="outline"
            onPress={handleDiagnosticTest}
          />
          {diagnosticFeedback ? (
            <Text style={styles.helperText} testID="monitoring-diagnostic-feedback">
              {diagnosticFeedback}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
  },
  nameText: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emailText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  roleBadge: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    alignSelf: 'flex-start',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
});
