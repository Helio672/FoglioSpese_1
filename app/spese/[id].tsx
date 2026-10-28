import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ExpenseForm } from '@/src/components/ExpenseForm';
import { deleteExpense, updateExpense } from '@/src/data/expenseRepository';
import { useAppDb } from '@/src/hooks/useAppDb';
import { useCatalogoCategorie } from '@/src/hooks/useCategorie';
import { useSpesa } from '@/src/hooks/useSpese';

export default function ModificaSpesaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useAppDb();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const { item, loading: loadingSpesa, error: errorSpesa } = useSpesa(id);
  const { items: categories, subcategoriesByCategory, loading: loadingCat, error: errorCat } = useCatalogoCategorie();

  const loading = loadingSpesa || loadingCat;
  const error = errorSpesa || errorCat;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? 'Spesa non trovata.'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ExpenseForm
        initial={item}
        categories={categories}
        subcategoriesByCategory={subcategoriesByCategory}
        submitLabel="Aggiorna spesa"
        onSubmit={async (input) => {
          await updateExpense(db, item.id, input);
          router.back();
        }}
        onDelete={async () => {
          await deleteExpense(db, item.id);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
