import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Option = { label: string; value: string };

type Props = {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: Option[];
  enabled?: boolean;
};

export function SelectField({
  label,
  selectedValue,
  onValueChange,
  options,
  enabled = true,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === selectedValue) ?? options[0],
    [options, selectedValue]
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Pressable
        disabled={!enabled}
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${selectedOption?.label ?? 'Seleziona'}`}
        style={({ pressed }) => [
          styles.triggerBox,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: enabled ? (pressed ? 0.8 : 1) : 0.5,
          },
        ]}>
        <Text
          numberOfLines={1}
          style={[styles.triggerText, { color: colors.text }]}>
          {selectedOption ? selectedOption.label : 'Seleziona...'}
        </Text>
        <Text style={[styles.chevron, { color: colors.muted }]}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {label}
              </Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable
                    onPress={() => {
                      onValueChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && {
                        backgroundColor:
                          scheme === 'dark'
                            ? 'rgba(111, 207, 176, 0.15)'
                            : 'rgba(15, 110, 86, 0.08)',
                      },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: isSelected ? colors.accent : colors.text,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}>
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Text style={[styles.check, { color: colors.accent }]}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.muted }]}>
                  Annulla
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  triggerBox: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 11,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 4,
  },
  optionRow: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
