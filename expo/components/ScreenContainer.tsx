import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { getScreenPadding } from '@/constants/fonts';

interface ScreenContainerProps {
  children: ReactNode;
  style?: object;
  noPadding?: boolean;
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style, noPadding = false }) => {
  return (
    <View style={[styles.container, !noPadding && styles.withPadding, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  withPadding: {
    ...getScreenPadding()
  }
});

export default ScreenContainer;