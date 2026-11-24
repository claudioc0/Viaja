import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/StatusState';
import { useMyReservationsQuery } from '../../src/hooks/use-viaja-queries';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatReservationStatusLabel,
  formatTimeUTC,
} from '../../src/utils/formatters';
import { colors, radii, spacing } from '../../src/utils/theme';

export default function MyTicketsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyReservationsQuery();

  if (isLoading) {
    return (
      <View style={styles.padded}>
        <LoadingState message="Buscando suas passagens digitais..." />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.padded}>
        <ErrorState
          message={error instanceof Error ? error.message : 'Falha ao consultar suas reservas.'}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const reservations = data ?? [];

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={reservations}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListEmptyComponent={
        <EmptyState
          title="Você ainda não possui reservas"
          description="Pesquise um destino e compre sua primeira passagem digital."
          actionLabel="Buscar passagens"
          onAction={() => router.push('/(tabs)')}
        />
      }
      renderItem={({ item }) => {
        const seatList = item.seats.map((s) => s.seatNumber).join(', ');
        const isConfirmed = item.status === 'CONFIRMED';
        const isCancelled = item.status === 'CANCELLED' || item.status === 'EXPIRED';

        return (
          <Pressable onPress={() => router.push(`/tickets/${item.id}`)} style={styles.ticketCard}>
            <View style={styles.topRow}>
              <Text style={styles.codeText}>{item.code}</Text>
              <View
                style={[
                  styles.statusBadge,
                  isConfirmed
                    ? styles.badgeSuccess
                    : isCancelled
                      ? styles.badgeDanger
                      : styles.badgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isConfirmed
                      ? styles.textSuccess
                      : isCancelled
                        ? styles.textDanger
                        : styles.textWarning,
                  ]}
                >
                  {formatReservationStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.routeTitle}>
              {item.trip.route.origin} → {item.trip.route.destination}
            </Text>

            <Text style={styles.metaText}>
              {formatDateBR(item.trip.departureAt)} às {formatTimeUTC(item.trip.departureAt)} ·
              Poltronas: {seatList}
            </Text>

            <View style={styles.bottomRow}>
              <Text style={styles.priceText}>{formatCurrencyBRL(item.totalPrice)}</Text>
              <Text style={styles.openLink}>Abrir passagem digital →</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeSuccess: { backgroundColor: colors.successSoft },
  badgeWarning: { backgroundColor: colors.warningSoft },
  badgeDanger: { backgroundColor: colors.dangerSoft },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSuccess: { color: colors.successText },
  textWarning: { color: colors.warningText },
  textDanger: { color: colors.dangerText },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottomRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  openLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
});
