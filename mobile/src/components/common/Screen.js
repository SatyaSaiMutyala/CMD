import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors, mvs } from '../../theme';

/* Scrolling page body shared by every screen. The rubber-band bounce (iOS)
   and the stretch glow (Android) are turned off so pages stop dead at the ends. */
export default function Screen({ children, ...rest }) {
  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      {...rest}
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { paddingBottom: mvs(24) },
});
