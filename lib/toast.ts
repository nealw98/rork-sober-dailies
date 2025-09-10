import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'success') {
  Toast.show({
    type,
    text1: message,
    position: 'bottom',
    visibilityTime: 1600,
    bottomOffset: 56,
  });
}

export default Toast;


