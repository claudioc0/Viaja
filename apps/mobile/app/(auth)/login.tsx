import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@viaja/shared';
import { Button } from '../../src/components/Button';
import { FormInput } from '../../src/components/FormInput';
import { ApiClientError } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { colors, radii, spacing } from '../../src/utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setSubmitError(null);
    try {
      await signIn(values);
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Não foi possível autenticar no momento.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.title}>Bem-vindo ao VIAJA</Text>
          <Text style={styles.subtitle}>
            Pesquise rotas, escolha sua poltrona e embarque com sua passagem digital.
          </Text>
        </View>

        <View style={styles.card}>
          {submitError ? (
            <View style={styles.errorBanner} testID="login-error-banner">
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                testID="login-email-input"
                label="E-mail"
                placeholder="passageiro@viaja.app"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                errorMessage={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                testID="login-password-input"
                label="Senha"
                placeholder="Informe sua senha"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                errorMessage={errors.password?.message}
              />
            )}
          />

          <Button
            testID="login-submit-button"
            title="Entrar"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />

          <Button
            title="Esqueci minha senha"
            variant="outline"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.secondaryAction}
          />
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Ainda não tem cadastro?</Text>
          <Button
            title="Criar conta gratuita"
            variant="outline"
            onPress={() => router.push('/(auth)/register')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logoText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryAction: {
    marginTop: spacing.sm,
  },
  footerCard: {
    gap: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary,
  },
});
