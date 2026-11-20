import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from '../../navigation/routes';
import { colors, gutter, ms, mvs } from '../../theme';
import KeyboardScroll from './KeyboardScroll';

/* Scrolling page body shared by the tab screens: white, with the page's
   background shapes (`backdrop`) scrolling along with the content.
   The rubber-band bounce (iOS) and the stretch glow (Android) are turned off
   so pages stop dead at the ends. A text field on the page is scrolled above
   the keyboard when it is tapped (wrap the page in <KeyboardAvoider> too).
     top     space above the content, on top of the status bar
     tabBar  leave room for the floating tab bar at the bottom               */
export default function Screen({
  children,
  backdrop,
  top = 8,
  gap = 14,
  tabBar = true,
  ...rest
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardScroll
      {...rest}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          gap: mvs(gap),
          paddingTop: insets.top + mvs(top),
          paddingBottom:
            insets.bottom + (tabBar ? ms(TAB_BAR_SPACE) : mvs(28)),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />
      {backdrop ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {backdrop}
        </View>
      ) : null}
      {children}
    </KeyboardScroll>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, paddingHorizontal: gutter },
});
