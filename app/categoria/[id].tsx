import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { NamePromptModal } from '@/src/components/NamePromptModal';
import {
  createSubcategory,
  deleteSubcategory,
  updateSubcategory,
} from '@/src/data/categoryRepository';
import type { Subcategory } from '@/src/domain/types';
import { useAppDb } from '@/src/hooks/useAppDb';
import { useCategoria } from '@/src/hooks/useCategorie';

export default function SottocategorieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useAppDb();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const { category, subs, loading, error } = useCategoria(id);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [targetSub, setTargetSub] = useState<Subcategory | null>(null);

  function handleAdd() {
    setTargetSub(null);
    setModalMode('create');
  }

  function handleEdit(sub: Subcategory) {
    setTargetSub(sub);
    setModalMode('edit');
  }

  function handleDelete(sub: Subcategory) {
    Alert.alert(
      'Elimina sottocategoria',
      `Vuoi eliminare la sottocategoria "${sub.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubcategory(db, sub.id);
            } catch (err) {
              Alert.alert(
                'Impossibile eliminare',
                err instanceof Error ? err.message : 'Errore durante l\'eliminazione.',
              );
            }
          },
        },
      ],
    );
  }

  async function handleModalConfirm(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !category) {
      return;
    }
    try {
      if (modalMode === 'create') {
        await createSubcategory(db, category.id, trimmed);
      } else if (modalMode === 'edit' && targetSub) {
        await updateSubcategory(db, targetSub.id, trimmed);
      }
      setModalMode(null);
      setTargetSub(null);
    } catch (err) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Operazione non riuscita.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: category?.name ? `Sottocategorie: ${category.name}` : 'Sottocategorie',
        }}
      />

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      {!loading && !category ? (
        <Text style={[styles.emptyText, { color: colors.muted }]}>Categoria non trovata.</Text>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? undefined : (
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Nessuna sottocategoria presente. Aggiungine una con il pulsante in basso.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              </View>
              <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => handleEdit(item)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Rinomina sottocategoria ${item.name}`}>
                  <Text style={[styles.actionText, { color: colors.accent }]}>Rinomina</Text>
                </Pressable>
                <View style={[styles.btnDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Elimina sottocategoria ${item.name}`}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Elimina</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {category ? (
        <Pressable
          onPress={handleAdd}
          style={[styles.fab, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Aggiungi nuova sottocategoria">
          <Text style={styles.fabText}>+ Nuova sottocategoria</Text>
        </Pressable>
      ) : null}

      <NamePromptModal
        visible={modalMode !== null}
        title={modalMode === 'create' ? 'Nuova sottocategoria' : 'Rinomina sottocategoria'}
        initialValue={targetSub?.name ?? ''}
        confirmLabel={modalMode === 'create' ? 'Crea' : 'Salva'}
        onCancel={() => {
          setModalMode(null);
          setTargetSub(null);
        }}
        onConfirm={(name) => {
          void handleModalConfirm(name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loader: {
    marginVertical: 12,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  list: {
    gap: 10,
    paddingBottom: 96,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDivider: {
    width: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
