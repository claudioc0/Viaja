import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { FormInput } from '../../src/components/FormInput';
import { useBookingStore } from '../../src/stores/booking-store';
import { getTomorrowIsoDate } from '../../src/utils/formatters';
import { colors, radii, spacing } from '../../src/utils/theme';

const POPULAR_ROUTES = [
  { origin: 'São Paulo', destination: 'Rio de Janeiro', label: 'São Paulo → Rio de Janeiro' },
  { origin: 'São Paulo', destination: 'Curitiba', label: 'São Paulo → Curitiba' },
  { origin: 'São Paulo', destination: 'Belo Horizonte', label: 'São Paulo → Belo Horizonte' },
] as const;

export default function SearchTripsScreen() {
  const router = useRouter();
  const searchFilters = useBookingStore((s) => s.searchFilters);
  const setSearchFilters = useBookingStore((s) => s.setSearchFilters);
  const swapOriginDestination = useBookingStore((s) => s.swapOriginDestination);

  const [maxPriceInput, setMaxPriceInput] = useState(
    searchFilters.maxPrice ? String(searchFilters.maxPrice) : '',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleSearch = () => {
    if (!searchFilters.origin.trim() || !searchFilters.destination.trim()) {
      setFormError('Informe a origem e o destino para pesquisar.');
      return;
    }

    if (searchFilters.date && !/^\d{4}-\d{2}-\d{2}$/.test(searchFilters.date)) {
      setFormError('Informe a data no formato AAAA-MM-DD (ou deixe em branco para todas).');
      return;
    }

    setFormError(null);
    const parsedMaxPrice = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
    setSearchFilters({
      maxPrice: parsedMaxPrice && !Number.isNaN(parsedMaxPrice) ? parsedMaxPrice : undefined,
    });

    router.push('/trips/results');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>NOVA JORNADA</Text>
        <Text style={styles.heroTitle}>Para onde vamos hoje?</Text>

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <FormInput
          testID="search-origin-input"
          label="Origem"
          placeholder="Ex.: São Paulo"
          value={searchFilters.origin}
          onChangeText={(origin) => setSearchFilters({ origin })}
        />

        <View style={styles.swapRow}>
          <Pressable
            accessibilityRole="button"
            onPress={swapOriginDestination}
            style={styles.swapButton}
          >
            <Text style={styles.swapButtonText}>⇅ Inverter origem e destino</Text>
          </Pressable>
        </View>

        <FormInput
          testID="search-destination-input"
          label="Destino"
          placeholder="Ex.: Rio de Janeiro"
          value={searchFilters.destination}
          onChangeText={(destination) => setSearchFilters({ destination })}
        />

        <FormInput
          testID="search-date-input"
          label="Data de partida (AAAA-MM-DD — opcional)"
          placeholder="2026-11-25"
          value={searchFilters.date}
          onChangeText={(date) => setSearchFilters({ date })}
        />

        <View style={styles.quickDatesRow}>
          <Pressable
            style={styles.chip}
            onPress={() => setSearchFilters({ date: getTomorrowIsoDate(1) })}
          >
            <Text style={styles.chipText}>Amanhã</Text>
          </Pressable>
          <Pressable
            style={styles.chip}
            onPress={() => setSearchFilters({ date: getTomorrowIsoDate(2) })}
          >
            <Text style={styles.chipText}>+2 dias</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => setSearchFilters({ date: '' })}>
            <Text style={styles.chipText}>Qualquer data</Text>
          </Pressable>
        </View>

        <FormInput
          label="Preço máximo (R$ — opcional)"
          placeholder="Ex.: 200"
          keyboardType="numeric"
          value={maxPriceInput}
          onChangeText={setMaxPriceInput}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Exibir apenas viagens com poltronas livres</Text>
          <Switch
            value={searchFilters.onlyAvailable}
            onValueChange={(onlyAvailable) => setSearchFilters({ onlyAvailable })}
            trackColor={{ false: colors.border, true: colors.brand }}
          />
        </View>

        <Button testID="search-submit-button" title="Pesquisar viagens" onPress={handleSearch} />
      </View>

      <View style={styles.popularCard}>
        <Text style={styles.sectionTitle}>Trechos mais buscados</Text>
        {POPULAR_ROUTES.map((item) => (
          <Pressable
            key={item.label}
            style={styles.popularItem}
            onPress={() => {
              setSearchFilters({
                origin: item.origin,
                destination: item.destination,
                date: '',
              });
              router.push('/trips/results');
            }}
          >
            <Text style={styles.popularLabel}>{item.label}</Text>
            <Text style={styles.popularArrow}>Ver horários →</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '600',
  },
  swapRow: {
    alignItems: 'flex-end',
    marginTop: -6,
    marginBottom: 8,
  },
  swapButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.brandSoft,
  },
  swapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  quickDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  popularCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  popularItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  popularLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  popularArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
});
