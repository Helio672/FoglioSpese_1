import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';

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

export function SelectField({ label, selectedValue, onValueChange, options, enabled = true }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Picker
          enabled={enabled}
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          dropdownIconColor={colors.text}
          style={{ color: colors.text }}>
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} color={colors.text} />
          ))}
        </Picker>
      </View>
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
  pickerBox: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
  },
});
