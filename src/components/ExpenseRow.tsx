import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatDateIt, formatTimeHHmm, parseLocalDateTime } from '@/src/domain/datetime';
import { formatEuroFromCents } from '@/src/domain/money';
import type { ExpenseListItem } from '@/src/domain/types';

type Props = {
  item: ExpenseListItem;
  onPress: () => void;
};

export function ExpenseRow({ item, onPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const when = parseLocalDateTime(item.occurredAt);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.main}>
        <Text style={[styles.cat, { color: colors.text }]}>
          {item.categoryName} · {item.subcategoryName}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {formatDateIt(when)} {formatTimeHHmm(when)}
          {item.note ? ` · ${item.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>{formatEuroFromCents(item.amountCents)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  cat: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
});
