import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleServicesPath =
    process.env.GOOGLE_SERVICES_JSON ?? path.resolve(__dirname, 'google-services.json');
  const iosGoogleServicesPath =
    process.env.GOOGLE_SERVICES_PLIST ?? path.resolve(__dirname, 'GoogleService-Info.plist');

  const hasAndroidFirebaseConfig = fs.existsSync(androidGoogleServicesPath);
  const hasIosFirebaseConfig = fs.existsSync(iosGoogleServicesPath);
  const enableNativeFirebasePlugins =
    hasAndroidFirebaseConfig || hasIosFirebaseConfig || process.env.EAS_BUILD === 'true';

  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
  ];

  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ]);
  }

  if (enableNativeFirebasePlugins) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/crashlytics');
  }

  return {
    ...config,
    name: 'VIAJA',
    slug: 'viaja',
    version: '0.1.0',
    orientation: 'portrait',
    scheme: 'viaja',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    plugins,
    experiments: {
      typedRoutes: false,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.viaja.mobile',
      ...(hasIosFirebaseConfig ? { googleServicesFile: iosGoogleServicesPath } : {}),
    },
    android: {
      package: 'app.viaja.mobile',
      ...(hasAndroidFirebaseConfig ? { googleServicesFile: androidGoogleServicesPath } : {}),
    },
    extra: {
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? '00000000-0000-4000-8000-000000000000',
      },
    },
  };
};
