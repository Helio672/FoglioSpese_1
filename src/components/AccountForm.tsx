import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ACCOUNT_KINDS } from '@/src/domain/accounts';
import type { Account, AccountKind } from '@/src/domain/types';

type Props = {
  initial?: Account | null;
  submitLabel: string;
  onSubmit: (input: { name: string; kind: AccountKind }) => Promise<void>;
  onArchive?: () => Promise<void>;
};

export function AccountForm({ initial, submitLabel, onSubmit, onArchive }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'liquidity');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Il Tipo conto si sceglie alla creazione: cambiarlo renderebbe incoerenti Saldi e Movimenti.
  const kindLocked = Boolean(initial);

  async function handleSave() {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Il nome del conto è obbligatorio.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name, kind });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setFormError(null);
    setSaving(true);
    try {
      await onArchive?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Archiviazione non riuscita.');
      setSaving(false);
    }
  }

  function confirmArchive() {
    Alert.alert('Archivia conto', `Vuoi archiviare "${initial?.name}"? Non comparirà più nell'elenco.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Archivia',
        style: 'destructive',
        onPress: () => {
          void handleArchive();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.muted }]}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="es. Conto corrente BBVA"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        />

        <Text style={[styles.label, { color: colors.muted }]}>Tipo conto</Text>
        {ACCOUNT_KINDS.map((option) => {
          const selected = option.kind === kind;
          return (
            <Pressable
              key={option.kind}
              disabled={kindLocked}
              onPress={() => setKind(option.kind)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: kindLocked }}
              style={[
                styles.kindOption,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: colors.card,
                  opacity: kindLocked && !selected ? 0.4 : 1,
                },
              ]}>
              <Text style={{ color: selected ? colors.accent : colors.text, fontSize: 16, fontWeight: '600' }}>
                {option.singular}
              </Text>
            </Pressable>
          );
        })}
        {kindLocked ? (
          <Text style={[styles.hint, { color: colors.muted }]}>Il tipo non si può cambiare dopo la creazione.</Text>
        ) : null}

        {formError ? <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text> : null}

        <Pressable
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
          style={[styles.save, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}>
          <Text style={styles.saveText}>{saving ? 'Salvataggio…' : submitLabel}</Text>
        </Pressable>

        {onArchive ? (
          <Pressable onPress={confirmArchive} disabled={saving} style={styles.archiveBtn}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Archivia conto</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 48,
  },
  kindOption: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  hint: { fontSize: 12 },
  error: { fontSize: 13 },
  save: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  archiveBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
