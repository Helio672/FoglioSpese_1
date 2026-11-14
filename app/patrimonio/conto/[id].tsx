import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AccountForm } from '@/src/components/AccountForm';
import { archiveAccount, renameAccount } from '@/src/data/accountRepository';
import { useAppDb } from '@/src/hooks/useAppDb';
import { useConto } from '@/src/hooks/useConti';

export default function ModificaContoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useAppDb();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { item, loading, error } = useConto(id);

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
        <Text style={{ color: colors.danger }}>{error ?? 'Conto non trovato.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AccountForm
        initial={item}
        submitLabel="Salva"
        onSubmit={async (input) => {
          await renameAccount(db, item.id, input.name);
          router.back();
        }}
        onArchive={async () => {
          await archiveAccount(db, item.id);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
