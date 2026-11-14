import { useRouter } from 'expo-router';
import { View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AccountForm } from '@/src/components/AccountForm';
import { createAccount } from '@/src/data/accountRepository';
import { useAppDb } from '@/src/hooks/useAppDb';

export default function NuovoContoScreen() {
  const router = useRouter();
  const db = useAppDb();
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AccountForm
        submitLabel="Crea conto"
        onSubmit={async (input) => {
          await createAccount(db, input);
          router.back();
        }}
      />
    </View>
  );
}
