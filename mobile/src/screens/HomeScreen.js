import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HomeHero, SoftwareCard } from '../components/approvals';
import { Eyebrow, Screen } from '../components/common';
import { REGISTRY } from '../data/registry';
import { ROUTES } from '../navigation/routes';
import { useAuth } from '../store/AuthProvider';
import { useHub } from '../store/HubProvider';
import { swPending, totalPending } from '../store/selectors';
import { gutter, mvs } from '../theme';

/* Hub: total pending and the list of software */
export default function HomeScreen({ navigation }) {
  const { store } = useHub();
  const { user } = useAuth();

  return (
    <Screen>
      <HomeHero total={totalPending(store)} userName={user.name} />
      <Eyebrow style={styles.eyebrow}>SOFTWARE</Eyebrow>
      <View style={styles.stack}>
        {REGISTRY.map(sw => (
          <SoftwareCard
            key={sw.id}
            sw={sw}
            pending={sw.connected ? swPending(store, sw) : null}
            onPress={() =>
              navigation.navigate(ROUTES.software, { swId: sw.id })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginTop: mvs(20),
    marginHorizontal: gutter,
    marginBottom: mvs(10),
  },
  stack: { gap: mvs(12), paddingHorizontal: gutter },
});
