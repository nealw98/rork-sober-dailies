import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { EnhancedSearchResult } from '@/constants/bigbook';

interface BigBookSearchResultsProps {
  results: EnhancedSearchResult[];
  onResultPress: (result: EnhancedSearchResult) => void;
  onDone: () => void;
}

// Android-specific implementation with grouped results by chapter
const BigBookSearchResults = ({ results, onResultPress, onDone }: BigBookSearchResultsProps) => {
  // Group results by chapter
  const groupedResults = useMemo(() => {
    const groups: Record<string, {
      chapterId: string,
      chapterTitle: string,
      results: EnhancedSearchResult[]
    }> = {};

    results.forEach(result => {
      const chapterId = result.chapterInfo.id;
      if (!groups[chapterId]) {
        groups[chapterId] = {
          chapterId,
          chapterTitle: result.chapterInfo.title,
          results: []
        };
      }
      groups[chapterId].results.push(result);
    });

    // Convert to array and sort by first result's page number
    return Object.values(groups).sort((a, b) => {
      const aPage = a.results[0]?.pageNumberNumeric || 0;
      const bPage = b.results[0]?.pageNumberNumeric || 0;
      return aPage - bPage;
    });
  }, [results]);

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No results found</Text>
        <Text style={styles.emptySubtext}>Try a different search term</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'match' : 'matches'} found
        </Text>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
      
      {groupedResults.map((group) => (
        <View key={group.chapterId} style={styles.chapterGroup}>
          {/* Chapter header - tappable */}
          <TouchableOpacity
            style={styles.chapterHeader}
            onPress={() => onResultPress(group.results[0])}
          >
            <View style={styles.chapterTitleContainer}>
              <Text style={styles.chapterTitle}>{group.chapterTitle}</Text>
              <View style={styles.matchCountBadge}>
                <Text style={styles.matchCountText}>{group.results.length}</Text>
              </View>
            </View>
            <View style={styles.chapterHeaderRight}>
              <Text style={styles.chapterSubtext}>Opens chapter with highlights</Text>
              <ChevronRight size={20} color={Colors.light.tint} />
            </View>
          </TouchableOpacity>
          
          {/* Snippets - non-interactive */}
          <View style={styles.snippetsContainer}>
            {group.results.map((result, index) => (
              <View key={`${result.id}-${index}`} style={styles.snippetItem}>
                <View style={styles.snippetHeader}>
                  <Text style={styles.pageNumber}>Page {result.pageNumber}</Text>
                </View>
                <View style={styles.excerptContainer}>
                  <Text style={styles.excerptText}>
                    {result.matchContext.before && `...${result.matchContext.before}`}
                    <Text style={styles.matchText}>
                      {result.matchContext.match}
                    </Text>
                    {result.matchContext.after && `${result.matchContext.after}...`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  doneButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  doneButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
  },
  chapterGroup: {
    marginBottom: 8,
    backgroundColor: Colors.light.background,
  },
  chapterHeader: {
    padding: 16,
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  chapterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('700'),
    color: Colors.light.text,
    flex: 1,
  },
  matchCountBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  matchCountText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
  },
  chapterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterSubtext: {
    fontSize: 14,
    color: Colors.light.muted,
    flex: 1,
  },
  snippetsContainer: {
    backgroundColor: Colors.light.background,
  },
  snippetItem: {
    padding: 12,
    paddingLeft: 24, // Indent snippets
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  snippetHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  pageNumber: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  excerptContainer: {
    marginBottom: 4,
  },
  excerptText: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
  },
  matchText: {
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    lineHeight: 20,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
});

export default BigBookSearchResults;
