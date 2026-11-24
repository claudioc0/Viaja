import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MAX_SEATS_PER_RESERVATION, type SeatAvailabilityDto } from '@viaja/shared';
import { BusSeatMap } from '../../../src/components/BusSeatMap';
import { Button } from '../../../src/components/Button';
import { ErrorState, LoadingState } from '../../../src/components/StatusState';
import { useTripDetailsQuery, useTripSeatsQuery } from '../../../src/hooks/use-viaja-queries';
import { useBookingStore } from '../../../src/stores/booking-store';
import { formatCurrencyBRL, formatDateBR, formatTimeUTC } from '../../../src/utils/formatters';
import { colors, radii, spacing } from '../../../src/utils/theme';

export default function SelectSeatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const tripId = String(params.id ?? '');

  const selectedTrip = useBookingStore((s) => s.selectedTrip);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const startSeatSelection = useBookingStore((s) => s.startSeatSelection);
  const toggleSeatSelection = useBookingStore((s) => s.toggleSeatSelection);
  const syncSelectionWithFreshAvailability = useBookingStore(
    (s) => s.syncSelectionWithFreshAvailability,
  );

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const tripQuery = useTripDetailsQuery(tripId);
  const seatsQuery = useTripSeatsQuery(tripId);

  useEffect(() => {
    if (tripQuery.data && (!selectedTrip || selectedTrip.id !== tripQuery.data.id)) {
      startSeatSelection(tripQuery.data);
    }
  }, [tripQuery.data, selectedTrip, startSeatSelection]);

  useEffect(() => {
    if (seatsQuery.data?.seats) {
      const removed = syncSelectionWithFreshAvailability(seatsQuery.data.seats);
      if (removed.length > 0) {
        setNoticeMessage(
          `A disponibilidade foi atualizada: poltrona(s) ${removed.join(', ')} não está(ão) mais livre(s).`,
        );
      }
    }
  }, [seatsQuery.data, syncSelectionWithFreshAvailability]);

  const handleToggleSeat = (seat: SeatAvailabilityDto) => {
    setNoticeMessage(null);
    const result = toggleSeatSelection(seat);
    if (result.limitReached) {
      setNoticeMessage(
        `Limite atingido: selecione no máximo ${MAX_SEATS_PER_RESERVATION} poltronas por compra.`,
      );
    }
  };

  if (seatsQuery.isLoading || tripQuery.isLoading) {
    return (
      <View style={styles.padded}>
        <LoadingState message="Consultando mapa de assentos em tempo real..." />
      </View>
    );
  }

  if (seatsQuery.isError || !seatsQuery.data) {
    return (
      <View style={styles.padded}>
        <ErrorState
          message={
            seatsQuery.error instanceof Error
              ? seatsQuery.error.message
              : 'Não foi possível consultar a disponibilidade de assentos.'
          }
          onRetry={() => void seatsQuery.refetch()}
        />
      </View>
    );
  }

  const trip = tripQuery.data ?? selectedTrip;
  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={seatsQuery.isRefetching}
            onRefresh={() => void seatsQuery.refetch()}
          />
        }
      >
        {trip ? (
          <View style={styles.tripSummaryCard}>
            <Text style={styles.tripRoute}>
              {trip.route.origin} → {trip.route.destination}
            </Text>
            <Text style={styles.tripMeta}>
              {formatDateBR(trip.departureAt)} · {formatTimeUTC(trip.departureAt)} · {trip.bus.name}
            </Text>
          </View>
        ) : null}

        {noticeMessage ? (
          <View style={styles.warningBanner} testID="seat-limit-warning">
            <Text style={styles.warningText}>{noticeMessage}</Text>
          </View>
        ) : null}

        <BusSeatMap
          seats={seatsQuery.data.seats}
          selectedSeatIds={selectedSeats.map((s) => s.id)}
          onToggleSeat={handleToggleSeat}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.selectedLabel}>
            Poltronas ({selectedSeats.length}/{MAX_SEATS_PER_RESERVATION}):{' '}
            <Text style={styles.selectedNumbers}>
              {selectedSeats.map((s) => s.seatNumber).join(', ') || 'Nenhuma'}
            </Text>
          </Text>
          <Text style={styles.totalValue} testID="seats-total-price">
            {formatCurrencyBRL(totalAmount)}
          </Text>
        </View>

        <Button
          testID="proceed-to-checkout-button"
          title="Continuar"
          disabled={selectedSeats.length === 0}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    padding: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 32,
  },
  tripSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tripRoute: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tripMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.md,
  },
  warningText: {
    color: colors.warningText,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedNumbers: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.brand,
    marginTop: 2,
  },
});
