// Keyboard scope for React Native <Modal> content.
//
// RN <Modal> renders in a separate native window, so the app-root
// KeyboardProvider (in app/_layout.tsx) does NOT reach inside it — a
// KeyboardAwareScrollView inside a modal won't lift the focused input without
// its own provider. Wrap a modal's content in this to give it that scope.
// (No Done bar — inputs dismiss via their own Save/Send/Go buttons, backdrop
// taps, and keyboardShouldPersistTaps.)
//
// Usage:
//   <Modal ...>
//     <KeyboardModalScope>
//       ...content (use KeyboardAwareScrollView for scrollable forms)...
//     </KeyboardModalScope>
//   </Modal>
import React from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export function KeyboardModalScope({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
