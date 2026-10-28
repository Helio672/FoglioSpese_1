import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ExpenseForm } from '@/src/components/ExpenseForm';
import { createExpense } from '@/src/data/expenseRepository';
import { useAppDb } from '@/src/hooks/useAppDb';
import { useCatalogoCategorie } from '@/src/hooks/useCategorie';

export default function NuovaSpesaScreen() {
  const router = useRouter();
  const db = useAppDb();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { items: categories, subcategoriesByCategory, loading, error } = useCatalogoCategorie();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error}</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          Nessuna categoria disponibile. Creane una prima di registrare una spesa.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ExpenseForm
        categories={categories}
        subcategoriesByCategory={subcategoriesByCategory}
        submitLabel="Salva spesa"
        onSubmit={async (input) => {
          await createExpense(db, input);
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
