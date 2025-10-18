/**
 * Big Book Bookmark Dialog Component
 * 
 * Modal for creating or editing page-level bookmarks.
 * 
 * Add Mode: User taps blank bookmark icon to add bookmark to current page
 * Edit Mode: User taps filled bookmark icon to edit/remove existing bookmark
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface BigBookBookmarkDialogProps {
  visible: boolean;
  onClose: () => void;
  pageNumber: number;
  chapterTitle: string;
  existingLabel?: string;
  isEditing: boolean;
  onSave: (label: string) => void;
  onRemove?: () => void;
}

export function BigBookBookmarkDialog({
  visible,
  onClose,
  pageNumber,
  chapterTitle,
  existingLabel,
  isEditing,
  onSave,
  onRemove,
}: BigBookBookmarkDialogProps) {
  const [label, setLabel] = useState(existingLabel || '');

  // Update label when existingLabel changes
  useEffect(() => {
    setLabel(existingLabel || '');
  }, [existingLabel]);

  const handleSave = () => {
    onSave(label.trim());
    onClose();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    onClose();
  };

  const handleClose = () => {
    setLabel(existingLabel || '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          style={styles.container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? `Edit Bookmark` : `Bookmark Page ${pageNumber}`}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Page Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Page:</Text>
              <Text style={styles.infoValue}>{pageNumber}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Chapter:</Text>
              <Text style={styles.infoValue}>{chapterTitle}</Text>
            </View>

            {/* Label Input */}
            <View style={styles.labelSection}>
              <Text style={styles.labelTitle}>Label (Optional)</Text>
              <TextInput
                style={styles.labelInput}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g., Step 3, The Promises..."
                placeholderTextColor={Colors.light.muted}
                autoFocus={!isEditing}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Bookmark' : 'Save Bookmark'}
              </Text>
            </TouchableOpacity>

            {/* Remove Button (only in edit mode) */}
            {isEditing && onRemove && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemove}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.removeButtonText}>Remove Bookmark</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
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
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    flex: 1,
  },
  labelSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  labelTitle: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 8,
  },
  labelInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    marginLeft: 8,
  },
});

