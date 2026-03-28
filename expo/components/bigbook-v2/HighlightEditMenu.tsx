/**
 * Highlight Edit Menu Modal
 * 
 * Modal for editing or removing existing highlights.
 * Shows when user taps a highlighted sentence outside of highlight mode.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { BigBookHighlight } from '@/types/bigbook-v2';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface HighlightEditMenuProps {
  visible: boolean;
  highlight: BigBookHighlight | null;
  onUpdateNote: (note: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function HighlightEditMenu({
  visible,
  highlight,
  onUpdateNote,
  onRemove,
  onClose,
}: HighlightEditMenuProps) {
  const [noteText, setNoteText] = useState(highlight?.note || '');

  React.useEffect(() => {
    setNoteText(highlight?.note || '');
  }, [highlight]);

  const handleSaveNote = () => {
    onUpdateNote(noteText.trim());
    onClose();
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Highlight',
      'Are you sure you want to remove this highlight?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove();
            onClose();
          },
        },
      ]
    );
  };

  if (!highlight) return null;

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
            <Text style={styles.headerTitle}>Edit Highlight</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Highlighted Text Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Highlighted Text:</Text>
            <Text style={styles.previewText}>{highlight.textSnapshot}</Text>
          </View>

          {/* Note Input */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>
              {highlight.note ? 'Edit Note (optional)' : 'Add Note (optional)'}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add your thoughts or notes here..."
              placeholderTextColor={Colors.light.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveNote}>
              <Text style={styles.saveButtonText}>
                {highlight.note ? 'Update Note' : 'Save Note'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
              <Trash2 size={18} color={Colors.light.destructive || '#EF4444'} />
              <Text style={styles.removeButtonText}>Remove Highlight</Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 400,
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
  previewContainer: {
    backgroundColor: Colors.light.cardBackground || '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('400'),
    color: Colors.light.text,
    lineHeight: 20,
  },
  noteContainer: {
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.text,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 100,
    maxHeight: 150,
  },
  actions: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#FFFFFF',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.destructive || '#EF4444',
    gap: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.destructive || '#EF4444',
  },
});
