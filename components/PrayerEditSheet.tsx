import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Platform, ScrollView } from 'react-native';
// RN's KeyboardAvoidingView doesn't track the keyboard inside a <Modal>; use the
// keyboard-controller versions within a KeyboardProvider (no toolbar — Save dismisses).
import { KeyboardProvider, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResolvedPalette } from '@/types/theme';

/**
 * Add / edit sheet for a user prayer — a bottom sheet with Cancel / Save and a
 * Title + Prayer field. Save confirms and dismisses (no keyboard bar needed);
 * tapping the backdrop or a field's empty area also dismisses.
 */
export function PrayerEditSheet({
  palette,
  initialTitle = '',
  initialContent = '',
  canDelete = false,
  onSave,
  onDelete,
  onClose,
}: {
  palette: ResolvedPalette;
  initialTitle?: string;
  initialContent?: string;
  canDelete?: boolean;
  onSave: (title: string, content: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const insets = useSafeAreaInsets();
  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardProvider>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: palette.cardBackground, paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.cancel, { color: palette.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headTitle, { color: palette.text }]}>{canDelete ? 'Edit prayer' : 'Add prayer'}</Text>
            <Pressable onPress={() => canSave && onSave(title.trim(), content.trim())} hitSlop={8} disabled={!canSave}>
              <Text style={[styles.save, { color: palette.accent, opacity: canSave ? 1 : 0.4 }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: palette.muted }]}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., A prayer for patience"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text, borderColor: palette.divider }]}
              returnKeyType="next"
              autoFocus
            />

            <Text style={[styles.label, { color: palette.muted, marginTop: 20 }]}>PRAYER</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write the prayer…"
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.contentInput, { color: palette.text, borderColor: palette.divider }]}
              multiline
              textAlignVertical="top"
            />

            {canDelete && onDelete ? (
              <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={6}>
                <Text style={[styles.deleteText, { color: palette.destructive ?? '#C0392B' }]}>Delete prayer</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,140,0.35)', marginTop: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  cancel: { fontSize: 16 },
  headTitle: { fontSize: 16, fontWeight: '600' },
  save: { fontSize: 16, fontWeight: '700' },
  body: { padding: 20 },
  label: { fontSize: 11, letterSpacing: 1, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  contentInput: { minHeight: 160, paddingTop: 12, lineHeight: 22 },
  deleteBtn: { marginTop: 26, alignItems: 'center', paddingVertical: 12 },
  deleteText: { fontSize: 15, fontWeight: '600' },
});
