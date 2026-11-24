import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileTripItem } from '../features/trips/trips-api';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatDurationMinutes,
  formatTimeUTC,
} from '../utils/formatters';
import { colors, radii, spacing } from '../utils/theme';

interface TripCardProps {
  trip: MobileTripItem;
  onSelect: (trip: MobileTripItem) => void;
}

export function TripCard({ trip, onSelect }: TripCardProps) {
  const soldOut = trip.availableSeats <= 0 || trip.status !== 'SCHEDULED';

  return (
    <Pressable
      testID={`trip-card-${trip.id}`}
      disabled={soldOut}
      onPress={() => onSelect(trip)}
      style={({ pressed }) => [
        styles.card,
        soldOut && styles.cardDisabled,
        pressed && !soldOut && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.companyName}>{trip.bus.name}</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{formatDateBR(trip.departureAt)}</Text>
        </View>
      </View>

      <Text style={styles.routeText}>
        {trip.route.origin} → {trip.route.destination}
      </Text>

      <View style={styles.scheduleRow}>
        <View>
          <Text style={styles.timeText}>
            {formatTimeUTC(trip.departureAt)} → {formatTimeUTC(trip.arrivalAt)}
          </Text>
          <Text style={styles.durationText}>
            Duração: {formatDurationMinutes(trip.durationMinutes)}
          </Text>
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.priceText}>{formatCurrencyBRL(trip.price)}</Text>
          <Text style={[styles.availabilityText, soldOut && styles.soldOutText]}>
            {soldOut ? 'Esgotado' : `${trip.availableSeats} livres`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    borderColor: colors.brand,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand,
  },
  dateBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  durationText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  soldOutText: {
    color: colors.danger,
  },
});
