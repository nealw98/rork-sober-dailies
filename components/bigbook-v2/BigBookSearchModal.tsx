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
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useBigBookContent, SearchResult } from '@/hooks/use-bigbook-content';
import { useTextSettings } from '@/hooks/use-text-settings';
import { parseMarkdownItalics } from './markdownUtils';

interface BigBookSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToResult: (chapterId: string, paragraphId: string, searchTerm: string) => void;
}

export function BigBookSearchModal({
  visible,
  onClose,
  onNavigateToResult,
}: BigBookSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const { searchContent } = useBigBookContent();
  const { fontSize, lineHeight } = useTextSettings();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Clear old results first to prevent showing stale data
    setSearchResults([]);
    
    if (query.trim()) {
      const results = searchContent(query);
      setSearchResults(results);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleResultPress = (result: SearchResult) => {
    // Close the modal to let the reader show
    onClose();
    // Then navigate to the result with the search term for highlighting
    onNavigateToResult(result.chapterId, result.paragraphId, searchQuery.trim());
  };

  const handleDone = () => {
    // Clear search and close
    handleClearSearch();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDone}
    >
      <View style={styles.container}>
        {/* Teal Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Big Book</Text>
          <TouchableOpacity onPress={handleDone} style={styles.closeButton}>
            <X size={24} color="#fff" />
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
                  {/* Teal Indicator */}
                  <View style={styles.resultIndicator} />
                  
                  <View style={styles.resultContent}>
                    {/* Chapter Title */}
                    <Text style={[styles.resultChapter, { fontSize: fontSize - 2 }]}>{result.chapterTitle}</Text>

                    {/* Text Preview with Highlight */}
                    <Text style={[styles.resultText, { fontSize, lineHeight }]} numberOfLines={2}>
                      {parseMarkdownItalics(result.matches[0]?.context.before || '', `before-${result.paragraphId}`)}
                      <Text style={styles.resultMatch}>
                        {result.matches[0]?.context.match}
                      </Text>
                      {parseMarkdownItalics(result.matches[0]?.context.after || '', `after-${result.paragraphId}`)}
                    </Text>

                    {/* Metadata */}
                    <Text style={[styles.resultMeta, { fontSize: fontSize - 4 }]}>
                      Page {result.paragraph.pageNumber} • {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
                    </Text>
                  </View>
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
    backgroundColor: '#f5f6f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3D8B8B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f6f8',
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
    flexDirection: 'row',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    overflow: 'hidden',
  },
  resultIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3D8B8B',
  },
  resultContent: {
    flex: 1,
    paddingLeft: 8,
  },
  resultChapter: {
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
    color: '#3D8B8B',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  resultMatch: {
    backgroundColor: '#CCFBF1', // Freddie's teal bubble color
  },
  resultMeta: {
    fontSize: 11,
    color: Colors.light.muted,
  },
});
