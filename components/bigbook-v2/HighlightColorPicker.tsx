/**
 * Highlight Color Picker Modal
 * 
 * Modal for selecting highlight colors when highlighting text.
 * Shows 4 color options with visual previews.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { HighlightColor } from '@/types/bigbook-v2';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface HighlightColorPickerProps {
  visible: boolean;
  onSelectColor: (color: HighlightColor) => void;
  onClose: () => void;
}

// Color options with their display info
const COLOR_OPTIONS = [
  {
    color: HighlightColor.YELLOW,
    label: 'Yellow',
    value: 'rgba(255, 235, 59, 0.25)',
    previewBg: '#FEF08A',
  },
  {
    color: HighlightColor.GREEN,
    label: 'Green',
    value: 'rgba(76, 175, 80, 0.25)',
    previewBg: '#BBF7D0',
  },
  {
    color: HighlightColor.BLUE,
    label: 'Blue',
    value: 'rgba(33, 150, 243, 0.25)',
    previewBg: '#BFDBFE',
  },
  {
    color: HighlightColor.PINK,
    label: 'Pink',
    value: 'rgba(233, 30, 99, 0.25)',
    previewBg: '#FBCFE8',
  },
];

export function HighlightColorPicker({
  visible,
  onSelectColor,
  onClose,
}: HighlightColorPickerProps) {
  const handleSelectColor = (color: HighlightColor) => {
    console.log('[HighlightColorPicker] Color selected:', color);
    onSelectColor(color);
    // Don't close - let user continue highlighting with same color
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Highlight Color</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Color Options - Simple Row */}
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

          {/* Help Text */}
          <Text style={styles.helpText}>
            Tap a color to start highlighting
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorBox: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border || '#E5E7EB',
  },
  helpText: {
    fontSize: 13,
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
