import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, ScrollView } from 'react-native';
import { ms } from '../../theme';

/* Keeping text fields clear of the on-screen keyboard, on iPhone and Android.

   Two things are needed, and they are separate:
   1. the page must end where the keyboard begins — <KeyboardAvoider> does
      that (wrap the page in it);
   2. the field being typed in must be scrolled into view — <KeyboardScroll>
      does that. Use it instead of ScrollView on any page with a text field.
      Every <TextField> inside it asks to be shown when it is tapped, and
      again once the keyboard has finished opening.                          */

const RevealContext = createContext(null);

/** Inside a <KeyboardScroll>: a function (input) => void that scrolls that
    input above the keyboard. `null` outside one. */
export const useRevealField = () => useContext(RevealContext);

/** The keyboard's height on screen right now (0 when it is closed) */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // iPhone says before the keyboard moves, so the page can move with it
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setHeight(e.endCoordinates ? e.endCoordinates.height : 0),
    );
    const hide = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/* A ScrollView that brings the text field in use above the keyboard.
   `clear` is how much room to leave under the field (design pixels), so the
   button or the next field below it shows too. */
const KeyboardScroll = forwardRef(function KeyboardScroll(
  { children, clear = 110, ...rest },
  outerRef,
) {
  const scroll = useRef(null);
  // The field waiting to be shown once the keyboard is fully open
  const waiting = useRef(null);

  const show = useCallback(
    input => {
      const view = scroll.current;
      if (!view || !input) return;
      try {
        view.scrollResponderScrollNativeHandleToKeyboard(input, ms(clear), true);
      } catch (e) {
        // The field has gone meanwhile: nothing to show
      }
    },
    [clear],
  );

  const reveal = useCallback(
    input => {
      waiting.current = input;
      // Keyboard already open (moving from one field to the next)
      setTimeout(() => show(input), 60);
    },
    [show],
  );

  useEffect(() => {
    const opened = Keyboard.addListener('keyboardDidShow', () => {
      if (waiting.current) show(waiting.current);
    });
    const closed = Keyboard.addListener('keyboardDidHide', () => {
      waiting.current = null;
    });
    return () => {
      opened.remove();
      closed.remove();
    };
  }, [show]);

  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={node => {
          scroll.current = node;
          if (typeof outerRef === 'function') outerRef(node);
          else if (outerRef) outerRef.current = node;
        }}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        // A tap on a button while typing presses the button, not just the keyboard away
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        {...rest}
      >
        {children}
      </ScrollView>
    </RevealContext.Provider>
  );
});

export default KeyboardScroll;
