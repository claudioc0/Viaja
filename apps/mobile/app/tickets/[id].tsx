import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../../src/components/Button';
import { ErrorState, LoadingState } from '../../src/components/StatusState';
import {
  useCancelReservationMutation,
  useReservationDetailsQuery,
} from '../../src/hooks/use-viaja-queries';
import { ApiClientError } from '../../src/services/api';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatReservationStatusLabel,
  formatSeatTypeLabel,
  formatTimeUTC,
} from '../../src/utils/formatters';
import { colors, radii, spacing } from '../../src/utils/theme';

export default function DigitalTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const reservationId = String(params.id ?? '');

  const {
    data: reservation,
    isLoading,
    isError,
    error,
    refetch,
  } = useReservationDetailsQuery(reservationId);
  const cancelMutation = useCancelReservationMutation();
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.padded}>
        <LoadingState message="Emitindo sua passagem digital..." />
      </View>
    );
  }

  if (isError || !reservation) {
    return (
      <View style={styles.padded}>
        <ErrorState
          message={
            error instanceof Error ? error.message : 'Não foi possível carregar esta passagem.'
          }
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const canCancel =
    (reservation.status === 'CONFIRMED' || reservation.status === 'PENDING') &&
    new Date(reservation.trip.departureAt).getTime() > Date.now();

  const handleCancel = async () => {
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync(reservation.id);
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError ? err.message : 'Não foi possível cancelar a reserva.',
      );
    }
  };

  const seatSummary = reservation.seats.map((s) => s.seatNumber).join(', ');
  const seatClass = reservation.seats[0]
    ? formatSeatTypeLabel(reservation.seats[0].seatType)
    : 'Executivo';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.boardingPass}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.codeLabel}>CÓDIGO DA RESERVA</Text>
            <Text style={styles.codeValue} testID="ticket-code">
              {reservation.code}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              reservation.status === 'CONFIRMED'
                ? styles.pillSuccess
                : reservation.status === 'PENDING'
                  ? styles.pillWarning
                  : styles.pillDanger,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                reservation.status === 'CONFIRMED'
                  ? styles.textSuccess
                  : reservation.status === 'PENDING'
                    ? styles.textWarning
                    : styles.textDanger,
              ]}
            >
              {formatReservationStatusLabel(reservation.status)}
            </Text>
          </View>
        </View>

        <View style={styles.routeBlock}>
          <Text style={styles.cityText}>{reservation.trip.route.origin}</Text>
          <Text style={styles.arrowText}>↓</Text>
          <Text style={styles.cityText}>{reservation.trip.route.destination}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.cellLabel}>DATA</Text>
            <Text style={styles.cellValue}>{formatDateBR(reservation.trip.departureAt)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.cellLabel}>PARTIDA → CHEGADA</Text>
            <Text style={styles.cellValue}>
              {formatTimeUTC(reservation.trip.departureAt)} →{' '}
              {formatTimeUTC(reservation.trip.arrivalAt)}
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.cellLabel}>POLTRONAS</Text>
            <Text style={styles.cellValue}>
              {seatSummary} ({seatClass})
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.cellLabel}>ÔNIBUS</Text>
            <Text style={styles.cellValue}>
              {reservation.trip.bus.name} · {reservation.trip.bus.plate}
            </Text>
          </View>
        </View>

        <View style={styles.passengerBox}>
          <Text style={styles.cellLabel}>PASSAGEIRO</Text>
          <Text style={styles.cellValue}>{reservation.passenger.name}</Text>
          <Text style={styles.passengerEmail}>{reservation.passenger.email}</Text>
        </View>

        <View style={styles.perforationLine} />

        <View style={styles.qrSection}>
          <View style={styles.qrFrame}>
            <QRCode value={reservation.qrCodePayload} size={156} />
          </View>
          <Text style={styles.qrHint}>
            Apresente este QR Code juntamente com documento oficial no embarque.
          </Text>
          <Text style={styles.paymentMeta}>
            Total: {formatCurrencyBRL(reservation.totalPrice)}
            {reservation.payment
              ? ` · ${reservation.payment.method} (${reservation.payment.status})`
              : ''}
          </Text>
        </View>
      </View>

      {cancelError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{cancelError}</Text>
        </View>
      ) : null}

      {canCancel ? (
        <Button
          title="Cancelar esta reserva"
          variant="danger"
          loading={cancelMutation.isPending}
          onPress={handleCancel}
        />
      ) : null}

      <Button
        title="Ver todas as minhas passagens"
        variant="outline"
        onPress={() => router.replace('/(tabs)/tickets')}
      />
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
  boardingPass: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  pillSuccess: { backgroundColor: colors.successSoft },
  pillWarning: { backgroundColor: colors.warningSoft },
  pillDanger: { backgroundColor: colors.dangerSoft },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textSuccess: { color: colors.successText },
  textWarning: { color: colors.warningText },
  textDanger: { color: colors.dangerText },
  routeBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  arrowText: {
    fontSize: 13,
    color: colors.brand,
    fontWeight: '800',
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoCell: {
    gap: 2,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  passengerBox: {
    paddingTop: spacing.xs,
    gap: 2,
  },
  passengerEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  perforationLine: {
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.xs,
  },
  qrSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrFrame: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
  },
  errorBoxText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '600',
  },
});
