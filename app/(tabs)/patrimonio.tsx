import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { groupAccountsByKind } from '@/src/domain/accounts';
import { useConti } from '@/src/hooks/useConti';

export default function PatrimonioScreen() {
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { items, loading, error } = useConti();

  const sections = groupAccountsByKind(items).map((group) => ({
    title: group.title,
    data: group.accounts,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          loading ? undefined : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nessun conto presente. Creane uno con il pulsante in basso.
            </Text>
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/patrimonio/conto/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Conto ${item.name}. Tocca per modificarlo.`}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            {/* Segnaposto: il Valore arriva con i Saldi (#16) e i Movimenti (#17). */}
            <Text style={[styles.value, { color: colors.muted }]}>—</Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push('/patrimonio/conto/nuovo')}
        style={[styles.fab, { backgroundColor: colors.accent }]}
        accessibilityRole="button"
        accessibilityLabel="Aggiungi nuovo conto">
        <Text style={styles.fabText}>+ Nuovo conto</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  loader: { marginVertical: 12 },
  errorText: { fontSize: 14, marginBottom: 8 },
  list: { gap: 10, paddingBottom: 96 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 15 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  name: { fontSize: 17, fontWeight: '600', flex: 1 },
  value: { fontSize: 17, marginLeft: 12 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
