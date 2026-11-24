import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../utils/theme';
import { Button } from './Button';

export function LoadingState({ message = 'Carregando informações...' }: { message?: string }) {
  return (
    <View style={styles.card} testID="loading-state">
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.subtitle}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.card} testID="empty-state">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="outline" onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.card, styles.errorCard]} testID="error-state">
      <Text style={[styles.title, styles.errorTitle]}>{title}</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Button
          title="Tentar novamente"
          variant="outline"
          onPress={onRetry}
          style={styles.button}
          testID="retry-button"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.dangerText,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.dangerText,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
});
