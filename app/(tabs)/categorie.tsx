import { useRouter } from 'expo-router';
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
import { createCategory, deleteCategory, updateCategory } from '@/src/data/categoryRepository';
import type { Category } from '@/src/domain/types';
import { useAppDb } from '@/src/hooks/useAppDb';
import { useCatalogoCategorie } from '@/src/hooks/useCategorie';

export default function CategorieScreen() {
  const router = useRouter();
  const db = useAppDb();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const { items: categories, subs, loading, error } = useCatalogoCategorie();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [targetCategory, setTargetCategory] = useState<Category | null>(null);

  function countSubs(categoryId: string) {
    return subs.filter((sub) => sub.categoryId === categoryId).length;
  }

  function handleAdd() {
    setTargetCategory(null);
    setModalMode('create');
  }

  function handleEdit(category: Category) {
    setTargetCategory(category);
    setModalMode('edit');
  }

  function handleDelete(category: Category) {
    Alert.alert(
      'Elimina categoria',
      `Vuoi eliminare "${category.name}" e le sue sottocategorie?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(db, category.id);
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
    if (!trimmed) {
      return;
    }
    try {
      if (modalMode === 'create') {
        await createCategory(db, trimmed);
      } else if (modalMode === 'edit' && targetCategory) {
        await updateCategory(db, targetCategory.id, trimmed);
      }
      setModalMode(null);
      setTargetCategory(null);
    } catch (err) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Operazione non riuscita.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nessuna categoria presente. Creane una con il pulsante in basso.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const subCount = countSubs(item.id);
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                onPress={() => router.push(`/categoria/${item.id}`)}
                style={styles.cardContent}
                accessibilityRole="button"
                accessibilityLabel={`Categoria ${item.name}, ${subCount} sottocategorie. Tocca per visualizzarle.`}>
                <View style={styles.textCol}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.subCount, { color: colors.muted }]}>
                    {subCount} {subCount === 1 ? 'sottocategoria' : 'sottocategorie'} · Tocca per gestire
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
              </Pressable>

              <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => handleEdit(item)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Rinomina categoria ${item.name}`}>
                  <Text style={[styles.actionText, { color: colors.accent }]}>Rinomina</Text>
                </Pressable>
                <View style={[styles.btnDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Elimina categoria ${item.name}`}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Elimina</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Pressable
        onPress={handleAdd}
        style={[styles.fab, { backgroundColor: colors.accent }]}
        accessibilityRole="button"
        accessibilityLabel="Aggiungi nuova categoria">
        <Text style={styles.fabText}>+ Nuova categoria</Text>
      </Pressable>

      <NamePromptModal
        visible={modalMode !== null}
        title={modalMode === 'create' ? 'Nuova categoria' : 'Rinomina categoria'}
        initialValue={targetCategory?.name ?? ''}
        confirmLabel={modalMode === 'create' ? 'Crea' : 'Salva'}
        onCancel={() => {
          setModalMode(null);
          setTargetCategory(null);
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  subCount: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
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
