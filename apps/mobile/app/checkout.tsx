import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PaymentMethod } from '@viaja/shared';
import { Button } from '../src/components/Button';
import { EmptyState } from '../src/components/StatusState';
import { useCompleteCheckoutMutation } from '../src/hooks/use-viaja-queries';
import { ApiClientError } from '../src/services/api';
import { useAuthStore } from '../src/stores/auth-store';
import { useBookingStore } from '../src/stores/booking-store';
import { formatCurrencyBRL, formatDateBR, formatTimeUTC } from '../src/utils/formatters';
import { colors, radii, spacing } from '../src/utils/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const selectedTrip = useBookingStore((s) => s.selectedTrip);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const clearBookingDraft = useBookingStore((s) => s.clearBookingDraft);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutMutation = useCompleteCheckoutMutation();

  if (!selectedTrip || selectedSeats.length === 0) {
    return (
      <View style={styles.padded}>
        <EmptyState
          title="Nenhuma seleção ativa"
          description="Escolha uma viagem e selecione suas poltronas antes de prosseguir ao pagamento."
          actionLabel="Buscar viagens"
          onAction={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleConfirmPurchase = async () => {
    setCheckoutError(null);
    try {
      const outcome = await checkoutMutation.mutateAsync({
        tripId: selectedTrip.id,
        seatIds: selectedSeats.map((s) => s.id),
        method: paymentMethod,
      });

      clearBookingDraft();
      router.replace(`/tickets/${outcome.reservation.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.statusCode === 409) {
          setCheckoutError(
            `${error.message} Volte ao mapa de poltronas para atualizar a disponibilidade.`,
          );
        } else {
          setCheckoutError(error.message);
        }
      } else {
        setCheckoutError('Falha inesperada ao processar sua reserva.');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {checkoutError ? (
        <View style={styles.errorBanner} testID="checkout-error-banner">
          <Text style={styles.errorTitle}>Não foi possível concluir a reserva</Text>
          <Text style={styles.errorText}>{checkoutError}</Text>
          <Button
            title="Revisar mapa de assentos"
            variant="outline"
            onPress={() => router.back()}
            style={styles.backToSeatsBtn}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>RESUMO DA VIAGEM</Text>
        <Text style={styles.routeTitle}>
          {selectedTrip.route.origin} → {selectedTrip.route.destination}
        </Text>
        <Text style={styles.metaLine}>
          Data: {formatDateBR(selectedTrip.departureAt)} · Partida{' '}
          {formatTimeUTC(selectedTrip.departureAt)} → Chegada{' '}
          {formatTimeUTC(selectedTrip.arrivalAt)}
        </Text>
        <Text style={styles.metaLine}>
          Ônibus: {selectedTrip.bus.name} · Placa {selectedTrip.bus.plate}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>PASSAGEIRO E ASSENTOS</Text>
        <Text style={styles.passengerName}>{user?.name}</Text>
        <Text style={styles.metaLine}>{user?.email}</Text>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <Text style={styles.metaLine}>Poltronas selecionadas ({selectedSeats.length})</Text>
          <Text style={styles.boldValue}>{selectedSeats.map((s) => s.seatNumber).join(', ')}</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.totalLabel}>Valor Total</Text>
          <Text style={styles.totalAmount}>{formatCurrencyBRL(totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>FORMA DE PAGAMENTO (SIMULADO)</Text>
        <View style={styles.methodsGrid}>
          <Pressable
            testID="payment-method-pix"
            onPress={() => setPaymentMethod('PIX')}
            style={[styles.methodOption, paymentMethod === 'PIX' && styles.methodOptionSelected]}
          >
            <Text
              style={[styles.methodTitle, paymentMethod === 'PIX' && styles.methodTitleSelected]}
            >
              PIX Instantâneo
            </Text>
            <Text style={styles.methodHint}>Aprovação imediata</Text>
          </Pressable>

          <Pressable
            testID="payment-method-card"
            onPress={() => setPaymentMethod('CREDIT_CARD')}
            style={[
              styles.methodOption,
              paymentMethod === 'CREDIT_CARD' && styles.methodOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.methodTitle,
                paymentMethod === 'CREDIT_CARD' && styles.methodTitleSelected,
              ]}
            >
              Cartão de Crédito
            </Text>
            <Text style={styles.methodHint}>Simulação 1x sem juros</Text>
          </Pressable>
        </View>

        <Button
          testID="confirm-checkout-button"
          title={`Pagar ${formatCurrencyBRL(totalAmount)} e emitir passagem`}
          loading={checkoutMutation.isPending}
          onPress={handleConfirmPurchase}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: spacing.lg,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand,
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: spacing.sm,
  },
  methodOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  methodOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  methodTitleSelected: {
    color: colors.brand,
  },
  methodHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.lg,
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dangerText,
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerText,
  },
  backToSeatsBtn: {
    marginTop: spacing.xs,
  },
});
