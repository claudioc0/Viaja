import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SeatAvailabilityDto } from '@viaja/shared';
import { formatSeatTypeLabel } from '../utils/formatters';
import { colors, radii, spacing } from '../utils/theme';

interface BusSeatMapProps {
  seats: SeatAvailabilityDto[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatAvailabilityDto) => void;
}

export function BusSeatMap({ seats, selectedSeatIds, onToggleSeat }: BusSeatMapProps) {
  const selectedSet = new Set(selectedSeatIds);

  // Group seats into rows of 4 (2 left + corridor + 2 right)
  const rows: SeatAvailabilityDto[][] = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  const sampleSeatType = seats[0]?.seatType;

  return (
    <View style={styles.wrapper}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotAvailable]} />
          <Text style={styles.legendLabel}>Disponível</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotSelected]} />
          <Text style={styles.legendLabel}>Selecionado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotOccupied]} />
          <Text style={styles.legendLabel}>Ocupado</Text>
        </View>
      </View>

      <View style={styles.busBody}>
        <View style={styles.driverBar}>
          <Text style={styles.driverText}>
            FRENTE · MOTORISTA {sampleSeatType ? `(${formatSeatTypeLabel(sampleSeatType)})` : ''}
          </Text>
        </View>

        {rows.map((rowSeats, rowIndex) => {
          const leftPair = rowSeats.slice(0, 2);
          const rightPair = rowSeats.slice(2, 4);

          return (
            <View key={`row-${rowIndex + 1}`} style={styles.seatRow}>
              <View style={styles.pairGroup}>
                {leftPair.map((seat) => renderSeatButton(seat, selectedSet, onToggleSeat))}
              </View>

              <View style={styles.corridor}>
                <Text style={styles.corridorText}>{rowIndex + 1}</Text>
              </View>

              <View style={styles.pairGroup}>
                {rightPair.map((seat) => renderSeatButton(seat, selectedSet, onToggleSeat))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function renderSeatButton(
  seat: SeatAvailabilityDto,
  selectedSet: Set<string>,
  onToggleSeat: (seat: SeatAvailabilityDto) => void,
) {
  const isOccupied = seat.status === 'OCCUPIED';
  const isSelected = selectedSet.has(seat.id);

  return (
    <Pressable
      key={seat.id}
      testID={`seat-${seat.seatNumber}`}
      accessibilityRole="button"
      accessibilityLabel={`Poltrona ${seat.seatNumber}, ${
        isOccupied ? 'Ocupada' : isSelected ? 'Selecionada' : 'Disponível'
      }`}
      accessibilityState={{ disabled: isOccupied, selected: isSelected }}
      disabled={isOccupied}
      onPress={() => onToggleSeat(seat)}
      style={[
        styles.seatButton,
        isOccupied ? styles.seatOccupied : isSelected ? styles.seatSelected : styles.seatAvailable,
      ]}
    >
      <Text
        style={[
          styles.seatNumberText,
          isOccupied
            ? styles.seatOccupiedText
            : isSelected
              ? styles.seatSelectedText
              : styles.seatAvailableText,
        ]}
      >
        {seat.seatNumber}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  dotAvailable: {
    backgroundColor: colors.successSoft,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  dotSelected: {
    backgroundColor: colors.brand,
  },
  dotOccupied: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.seatOccupied,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  busBody: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 10,
  },
  driverBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
    paddingBottom: 10,
    marginBottom: 4,
  },
  driverText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  corridor: {
    width: 32,
    alignItems: 'center',
  },
  corridorText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  seatButton: {
    width: 52,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  seatAvailable: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  seatSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  seatOccupied: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.seatOccupied,
  },
  seatNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  seatAvailableText: {
    color: colors.successText,
  },
  seatSelectedText: {
    color: colors.white,
  },
  seatOccupiedText: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
