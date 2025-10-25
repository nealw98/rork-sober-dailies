/**
 * Highlight Color Toast
 * 
 * Small toast/popup for selecting highlight colors.
 * Appears near the highlight icon when long-pressed.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { HighlightColor } from '@/types/bigbook-v2';

interface HighlightColorToastProps {
  visible: boolean;
  onSelectColor: (color: HighlightColor) => void;
  onClose: () => void;
}

// Color options with their display info
const COLOR_OPTIONS = [
  {
    color: HighlightColor.YELLOW,
    previewBg: '#FEF08A',
  },
  {
    color: HighlightColor.GREEN,
    previewBg: '#BBF7D0',
  },
  {
    color: HighlightColor.BLUE,
    previewBg: '#BFDBFE',
  },
  {
    color: HighlightColor.PINK,
    previewBg: '#FBCFE8',
  },
];

export function HighlightColorToast({
  visible,
  onSelectColor,
  onClose,
}: HighlightColorToastProps) {
  const handleSelectColor = (color: HighlightColor) => {
    console.log('[HighlightColorToast] Color selected:', color);
    onSelectColor(color);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.container}>
          {/* Color Options - Horizontal Row */}
          <View style={styles.colorOptions}>
            {COLOR_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.color}
                style={[styles.colorBox, { backgroundColor: option.previewBg }]}
                onPress={() => handleSelectColor(option.color)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100, // Position near the top where the icon is
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circular
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});


