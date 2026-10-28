import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ExpenseRow } from '@/src/components/ExpenseRow';
import { SelectField } from '@/src/components/SelectField';
import { formatEuroFromCents } from '@/src/domain/money';
import type { ExpenseFilter } from '@/src/domain/types';
import { useCatalogoCategorie } from '@/src/hooks/useCategorie';
import { useSpese } from '@/src/hooks/useSpese';

export default function SpeseScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [month, setMonth] = useState<ExpenseFilter['month']>('current');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const catalog = useCatalogoCategorie();

  const filter = useMemo<ExpenseFilter>(
    () => ({
      month,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
    }),
    [month, categoryId, subcategoryId],
  );

  const { items, totalCents, loading, error } = useSpese(filter);
  const subs = categoryId ? catalog.subcategoriesByCategory(categoryId) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.muted }]}>Totale filtro</Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>{formatEuroFromCents(totalCents)}</Text>
      </View>

      <SelectField
        label="Periodo"
        selectedValue={month}
        onValueChange={(value) => setMonth(value as ExpenseFilter['month'])}
        options={[
          { label: 'Mese corrente', value: 'current' },
          { label: 'Tutte', value: 'all' },
        ]}
      />
      <SelectField
        label="Categoria"
        selectedValue={categoryId}
        onValueChange={(value) => {
          setCategoryId(value);
          setSubcategoryId('');
        }}
        options={[
          { label: 'Tutte', value: '' },
          ...catalog.items.map((category) => ({ label: category.name, value: category.id })),
        ]}
      />
      <SelectField
        label="Sottocategoria"
        selectedValue={subcategoryId}
        onValueChange={setSubcategoryId}
        enabled={Boolean(categoryId)}
        options={[
          { label: categoryId ? 'Tutte' : 'Scegli prima una categoria', value: '' },
          ...subs.map((sub) => ({ label: sub.name, value: sub.id })),
        ]}
      />

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>
              Nessuna spesa con questi filtri.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ExpenseRow item={item} onPress={() => router.push(`/spese/${item.id}`)} />
        )}
      />

      <Pressable
        onPress={() => router.push('/spese/nuova')}
        style={[styles.fab, { backgroundColor: colors.accent }]}>
        <Text style={styles.fabText}>+ Nuova spesa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  totalCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  list: {
    gap: 8,
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
