import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SelectField } from '@/src/components/SelectField';
import { combineDateAndTime, formatDateIt, formatTimeHHmm, isValidHHmm, parseLocalDateTime } from '@/src/domain/datetime';
import { centsToInput, parseEuroToCents } from '@/src/domain/money';
import type { Category, ExpenseInput, ExpenseListItem, Subcategory } from '@/src/domain/types';

type Props = {
  categories: Category[];
  subcategoriesByCategory: (categoryId: string) => Subcategory[];
  initial?: ExpenseListItem | null;
  submitLabel: string;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function ExpenseForm({
  categories,
  subcategoriesByCategory,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : '');
  const [date, setDate] = useState(() => (initial ? parseLocalDateTime(initial.occurredAt) : new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState(initial ? formatTimeHHmm(parseLocalDateTime(initial.occurredAt)) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subs = useMemo(() => subcategoriesByCategory(categoryId), [categoryId, subcategoriesByCategory]);

  const activeSubcategoryId = useMemo(() => {
    if (subs.some((sub) => sub.id === subcategoryId)) {
      return subcategoryId;
    }
    return subs[0]?.id ?? '';
  }, [subs, subcategoryId]);

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowCalendar(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    setDate(selected);
  }

  async function handleSave() {
    setFormError(null);
    setTimeError(null);
    const cents = parseEuroToCents(amount);
    if (cents == null) {
      setFormError('Inserisci un importo in euro maggiore di zero (es. 12,50).');
      return;
    }
    if (time && !isValidHHmm(time)) {
      setTimeError('Usa il formato HH:mm (es. 09:30).');
      return;
    }
    if (!categoryId || !activeSubcategoryId) {
      setFormError('Scegli una categoria e una sottocategoria.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        amountCents: cents,
        occurredAt: combineDateAndTime(date, time),
        categoryId,
        subcategoryId: activeSubcategoryId,
        note,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Elimina spesa', 'Vuoi eliminare questa spesa?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          void onDelete?.();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.muted }]}>Importo (EUR)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        />

        <Text style={[styles.label, { color: colors.muted }]}>Data</Text>
        <Pressable
          onPress={() => setShowCalendar(true)}
          style={[styles.input, styles.pressable, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{formatDateIt(date)}</Text>
        </Pressable>
        {showCalendar ? (
          <DateTimePicker value={date} mode="date" display="calendar" onChange={onDateChange} />
        ) : null}

        <Text style={[styles.label, { color: colors.muted }]}>Ora</Text>
        <View style={styles.timeRow}>
          <TextInput
            value={time}
            onChangeText={(value) => {
              setTime(value);
              setTimeError(null);
            }}
            placeholder="HH:mm"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            style={[
              styles.input,
              styles.timeInput,
              { color: colors.text, borderColor: timeError ? colors.danger : colors.border, backgroundColor: colors.card },
            ]}
          />
          <Pressable
            onPress={() => {
              setTime(formatTimeHHmm(new Date()));
              setTimeError(null);
            }}
            style={[styles.nowBtn, { borderColor: colors.accent }]}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Adesso</Text>
          </Pressable>
        </View>
        {timeError ? <Text style={[styles.error, { color: colors.danger }]}>{timeError}</Text> : null}
        <Text style={[styles.hint, { color: colors.muted }]}>
          Lascia vuoto per usare l&apos;ora attuale al salvataggio.
        </Text>

        <SelectField
          label="Categoria"
          selectedValue={categoryId}
          onValueChange={setCategoryId}
          options={categories.map((category) => ({ label: category.name, value: category.id }))}
        />
        <SelectField
          label="Sottocategoria"
          selectedValue={activeSubcategoryId}
          onValueChange={setSubcategoryId}
          enabled={subs.length > 0}
          options={subs.map((sub) => ({ label: sub.name, value: sub.id }))}
        />

        <Text style={[styles.label, { color: colors.muted }]}>Nota (opzionale)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Dettaglio"
          placeholderTextColor={colors.muted}
          multiline
          style={[
            styles.input,
            styles.note,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
          ]}
        />

        {formError ? <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text> : null}

        <Pressable
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
          style={[styles.save, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}>
          <Text style={styles.saveText}>{saving ? 'Salvataggio…' : submitLabel}</Text>
        </Pressable>

        {onDelete ? (
          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Elimina spesa</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 48,
  },
  pressable: {
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  nowBtn: {
    minHeight: 48,
    minWidth: 88,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  hint: {
    fontSize: 12,
  },
  note: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13,
  },
  save: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
