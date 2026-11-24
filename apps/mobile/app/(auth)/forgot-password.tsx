import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { emailSchema } from '@viaja/shared';
import { Button } from '../../src/components/Button';
import { FormInput } from '../../src/components/FormInput';
import { colors, radii, spacing } from '../../src/utils/theme';

const forgotSchema = z.object({
  email: emailSchema,
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotFormValues) => {
    setSentTo(values.email);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.heading}>Recuperação de senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail cadastrado para receber instruções simuladas de redefinição.
        </Text>

        {sentTo ? (
          <View style={styles.successBanner} testID="forgot-success-banner">
            <Text style={styles.successTitle}>Instruções enviadas (Fluxo Demonstrativo)</Text>
            <Text style={styles.successBody}>
              Caso exista uma conta vinculada a {sentTo}, um link temporário de redefinição foi
              encaminhado.
            </Text>
            <Button
              title="Voltar para o login"
              variant="outline"
              onPress={() => router.back()}
              style={styles.backBtn}
            />
          </View>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="E-mail da conta"
                  placeholder="voce@exemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  errorMessage={errors.email?.message}
                />
              )}
            />
            <Button title="Enviar instruções" onPress={handleSubmit(onSubmit)} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  successBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    gap: spacing.xs,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.successText,
  },
  successBody: {
    fontSize: 13,
    color: colors.successText,
  },
  backBtn: {
    marginTop: spacing.sm,
  },
});
