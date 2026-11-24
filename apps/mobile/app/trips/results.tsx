import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/StatusState';
import { TripCard } from '../../src/components/TripCard';
import type { MobileTripItem } from '../../src/features/trips/trips-api';
import { useTripsQuery } from '../../src/hooks/use-viaja-queries';
import { useBookingStore } from '../../src/stores/booking-store';
import { colors, radii, spacing } from '../../src/utils/theme';

const SORT_OPTIONS: Array<{
  key: 'price_asc' | 'duration_asc' | 'departure_asc';
  label: string;
}> = [
  { key: 'price_asc', label: 'Menor preço' },
  { key: 'duration_asc', label: 'Menor duração' },
  { key: 'departure_asc', label: 'Horário de partida' },
];

export default function TripResultsScreen() {
  const router = useRouter();
  const searchFilters = useBookingStore((s) => s.searchFilters);
  const setSearchFilters = useBookingStore((s) => s.setSearchFilters);
  const startSeatSelection = useBookingStore((s) => s.startSeatSelection);

  const queryFilters = {
    origin: searchFilters.origin || undefined,
    destination: searchFilters.destination || undefined,
    date: searchFilters.date || undefined,
    maxPrice: searchFilters.maxPrice,
    onlyAvailable: searchFilters.onlyAvailable,
    sortBy: searchFilters.sortBy,
  };

  const { data, isLoading, isError, error, refetch, isRefetching } = useTripsQuery(queryFilters);

  const handleSelectTrip = (trip: MobileTripItem) => {
    startSeatSelection(trip);
    router.push(`/trips/${trip.id}/seats`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterHeader}>
        <Text style={styles.routeSummary}>
          {searchFilters.origin} → {searchFilters.destination}
          {searchFilters.date ? ` · ${searchFilters.date}` : ' · Todas as datas'}
        </Text>

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const active = searchFilters.sortBy === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`sort-chip-${opt.key}`}
                onPress={() => setSearchFilters({ sortBy: opt.key })}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.padded}>
          <LoadingState message="Consultando horários e tarifas..." />
        </View>
      ) : isError ? (
        <View style={styles.padded}>
          <ErrorState
            message={error instanceof Error ? error.message : 'Erro ao pesquisar viagens.'}
            onRetry={() => void refetch()}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma viagem encontrada"
              description="Não encontramos viagens para os filtros selecionados. Tente limpar a data ou aumentar o limite de preço."
              actionLabel="Ajustar pesquisa"
              onAction={() => router.back()}
            />
          }
          renderItem={({ item }) => <TripCard trip={item} onSelect={handleSelectTrip} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterHeader: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  routeSummary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.white,
  },
  padded: {
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
  },
});
