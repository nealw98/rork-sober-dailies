/**
 * Big Book Storage Example
 * 
 * Demonstrates how to use the highlights and bookmarks hooks.
 * This serves as both documentation and a testing interface.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { HighlightColor } from '@/types/bigbook-v2';
import Colors from '@/constants/colors';

export function BigBookStorageExample() {
  const highlights = useBigBookHighlights();
  const bookmarks = useBigBookBookmarks();
  
  // Test data
  const [testParagraphId] = useState('chapter-1-p1');
  const [testChapterId] = useState('chapter-1');
  const [testPageNumber] = useState(1);
  const [testText] = useState('This is a sample text for testing highlights.');
  const [noteText, setNoteText] = useState('');

  const handleAddHighlight = async () => {
    try {
      const highlight = await highlights.addHighlight(
        testParagraphId,
        testChapterId,
        0,
        testText.length,
        testText,
        HighlightColor.YELLOW
      );
      Alert.alert('Success', `Highlight created: ${highlight.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create highlight');
    }
  };

  const handleAddHighlightWithNote = async () => {
    try {
      const highlight = await highlights.addHighlight(
        `${testParagraphId}-note`,
        testChapterId,
        0,
        testText.length,
        testText,
        HighlightColor.GREEN
      );
      
      await highlights.updateHighlight(highlight.id, { note: noteText });
      Alert.alert('Success', 'Highlight with note created');
      setNoteText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to create highlight with note');
    }
  };

  const handleAddBookmark = async () => {
    try {
      const bookmark = await bookmarks.addBookmark(
        testParagraphId,
        testChapterId,
        testPageNumber,
        'Test Bookmark'
      );
      Alert.alert('Success', `Bookmark created: ${bookmark.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create bookmark');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all highlights and bookmarks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await highlights.clearAllHighlights();
            await bookmarks.clearAllBookmarks();
            Alert.alert('Success', 'All data cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Big Book Storage Testing</Text>
      
      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.text}>
          Highlights: {highlights.highlights.length} (Loading: {highlights.isLoading ? 'Yes' : 'No'})
        </Text>
        <Text style={styles.text}>
          Bookmarks: {bookmarks.bookmarks.length} (Loading: {bookmarks.isLoading ? 'Yes' : 'No'})
        </Text>
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleAddHighlight}>
          <Text style={styles.buttonText}>Add Yellow Highlight</Text>
        </TouchableOpacity>

        <View style={styles.noteInput}>
          <TextInput
            style={styles.input}
            placeholder="Enter note text..."
            value={noteText}
            onChangeText={setNoteText}
          />
          <TouchableOpacity 
            style={[styles.button, styles.buttonSmall]} 
            onPress={handleAddHighlightWithNote}
            disabled={!noteText.trim()}
          >
            <Text style={styles.buttonText}>Add Green Highlight w/ Note</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleAddBookmark}>
          <Text style={styles.buttonText}>Add Bookmark</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonDanger]} 
          onPress={handleClearAll}
        >
          <Text style={styles.buttonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* Highlights List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Highlights ({highlights.highlights.length})</Text>
        {highlights.highlights.map((h) => (
          <View key={h.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <View style={[styles.colorBadge, { backgroundColor: h.color }]} />
              <Text style={styles.itemTitle}>{h.paragraphId}</Text>
              <TouchableOpacity onPress={() => highlights.deleteHighlight(h.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemText} numberOfLines={2}>{h.textSnapshot}</Text>
            {h.note && <Text style={styles.noteText}>Note: {h.note}</Text>}
            <Text style={styles.itemMeta}>
              {new Date(h.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Bookmarks List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookmarks ({bookmarks.bookmarks.length})</Text>
        {bookmarks.bookmarks.map((b) => (
          <View key={b.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{b.label || 'Unnamed'}</Text>
              <TouchableOpacity onPress={() => bookmarks.deleteBookmark(b.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemText}>
              {b.paragraphId} (Page {b.pageNumber})
            </Text>
            <Text style={styles.itemMeta}>
              {new Date(b.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  button: {
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonSmall: {
    marginTop: 8,
  },
  buttonDanger: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noteInput: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  item: {
    backgroundColor: Colors.light.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  itemText: {
    fontSize: 12,
    color: Colors.light.text,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: Colors.light.muted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 10,
    color: Colors.light.muted,
  },
  deleteText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  colorBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});

