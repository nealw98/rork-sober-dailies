/**
 * Big Book Search Modal Component
 * 
 * Modal for searching across the entire Big Book.
 * Matches the design pattern of BigBookBookmarksList and BigBookHighlightsList.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { X, Search as SearchIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useBigBookContent, SearchResult } from '@/hooks/use-bigbook-content';

interface BigBookSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToResult: (chapterId: string, paragraphId: string) => void;
}

export function BigBookSearchModal({
  visible,
  onClose,
  onNavigateToResult,
}: BigBookSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const { searchContent } = useBigBookContent();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchContent(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleResultPress = (result: SearchResult) => {
    onNavigateToResult(result.chapterId, result.paragraphId);
    onClose();
    handleClearSearch();
  };

  const handleClose = () => {
    onClose();
    // Clear search when closing
    setTimeout(() => {
      handleClearSearch();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#E0F7FF', '#FFFFFF']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 1]}
          pointerEvents="none"
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Big Book</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <SearchIcon size={18} color={Colors.light.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search..."
              placeholderTextColor={Colors.light.muted}
              autoFocus={true}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <X size={18} color={Colors.light.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {searchQuery.length === 0 ? (
            // Empty State - No Search Yet
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>Search the Big Book</Text>
              <Text style={styles.emptyStateDescription}>
                Search across all chapters, stories, and appendices.
              </Text>
              <Text style={styles.emptyStateHint}>
                Enter a word or phrase to find passages.
              </Text>
            </View>
          ) : searchResults.length === 0 ? (
            // Empty State - No Results
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateTitle}>No Results Found</Text>
              <Text style={styles.emptyStateDescription}>
                No matches found for "{searchQuery}"
              </Text>
              <Text style={styles.emptyStateHint}>
                Try different keywords or check your spelling.
              </Text>
            </View>
          ) : (
            // Search Results
            <>
              <Text style={styles.countText}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </Text>

              {searchResults.slice(0, 50).map((result) => (
                <TouchableOpacity
                  key={result.paragraphId}
                  style={styles.resultCard}
                  onPress={() => handleResultPress(result)}
                  activeOpacity={0.7}
                >
                  {/* Chapter Title */}
                  <Text style={styles.resultChapter}>{result.chapterTitle}</Text>

                  {/* Text Preview with Highlight */}
                  <Text style={styles.resultText} numberOfLines={2}>
                    {result.matches[0]?.context.before}
                    <Text style={styles.resultMatch}>
                      {result.matches[0]?.context.match}
                    </Text>
                    {result.matches[0]?.context.after}
                  </Text>

                  {/* Metadata */}
                  <Text style={styles.resultMeta}>
                    Page {result.paragraph.pageNumber} • {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
  },
  resultChapter: {
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.tint,
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  resultMatch: {
    backgroundColor: '#FEF08A', // Yellow highlight
    fontWeight: adjustFontWeight('600'),
  },
  resultMeta: {
    fontSize: 11,
    color: Colors.light.muted,
  },
});

