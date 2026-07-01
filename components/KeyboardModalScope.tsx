// Keyboard scope for React Native <Modal> content.
//
// RN <Modal> renders in a separate native window, so the app-root
// KeyboardProvider (in app/_layout.tsx) does NOT reach inside it — the global
// KeyboardToolbar and KeyboardAwareScrollView won't work for modal forms.
// Wrap a modal's content in this to give it its own keyboard scope: the Done
// bar appears above the keyboard/number pad, and KeyboardAwareScrollView inside
// can auto-scroll the focused input above the keyboard.
//
// Usage:
//   <Modal ...>
//     <KeyboardModalScope>
//       ...content (use KeyboardAwareScrollView for scrollable forms)...
//     </KeyboardModalScope>
//   </Modal>
import React from 'react';
import { KeyboardProvider, KeyboardToolbar } from 'react-native-keyboard-controller';

export function KeyboardModalScope({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardProvider>
      {children}
      <KeyboardToolbar />
    </KeyboardProvider>
  );
}
