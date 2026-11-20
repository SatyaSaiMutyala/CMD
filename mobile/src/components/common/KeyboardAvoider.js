import React from 'react';
import { KeyboardAvoidingView } from 'react-native';

/* Keeps text fields and the buttons below them above the on-screen keyboard,
   on both iPhone and Android. Wrap any screen, sheet or modal that has a text
   field in it.

   "padding" adds space at the bottom equal to how much of this view the
   keyboard covers — and nothing when the keyboard is not over it, so it is
   safe on phones where the window already shrinks by itself. This app draws
   edge to edge on Android, where the window does NOT shrink, so Android needs
   it as much as iPhone does.

   `offset` is for a wrapper that does not start at the top of the screen
   (rarely needed). Other props go to KeyboardAvoidingView. */
export default function KeyboardAvoider({ children, offset = 0, ...rest }) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={offset}
      {...rest}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
