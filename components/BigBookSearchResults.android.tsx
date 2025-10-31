import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Platform } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { EnhancedSearchResult } from '@/constants/bigbook';

interface BigBookSearchResultsProps {
  results: EnhancedSearchResult[];
  onResultPress: (result: EnhancedSearchResult) => void;
}

interface GroupedResult {
  chapterId: string;
  chapterTitle: string;
  results: EnhancedSearchResult[];
}

const BigBookSearchResults: React.FC<BigBookSearchResultsProps> = ({
  results,
  onResultPress,
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const groupedResults = useMemo(() => {
    const groups: Record<string, GroupedResult> = {};
    
    results.forEach((result) => {
      if (!groups[result.chapterInfo.id]) {
        groups[result.chapterInfo.id] = {
          chapterId: result.chapterInfo.id,
          chapterTitle: result.chapterInfo.title,
          results: [],
        };
      }
      groups[result.chapterInfo.id].results.push(result);
    });

    return Object.values(groups);
  }, [results]);

  const toggleExpand = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleOpenChapter = (chapterId: string) => {
    // Open the first result of this chapter (which will load the entire chapter)
    const firstResult = groupedResults.find(group => group.chapterId === chapterId)?.results[0];
    if (firstResult) {
      onResultPress(firstResult);
    }
  };

  const renderChapterGroup = ({ item: group }: { item: GroupedResult }) => {
    const isExpanded = expandedChapters[group.chapterId];
    const resultCount = group.results.length;

    return (
      <View key={group.chapterId} style={styles.chapterGroup}>
        {/* Line 1: Chapter Title + Open Button */}
        <View style={styles.line1}>
          <Text style={styles.chapterTitle} numberOfLines={1}>
            {group.chapterTitle}
          </Text>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => handleOpenChapter(group.chapterId)}
            activeOpacity={0.7}
          >
            <Text style={styles.openButtonText}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* Line 2: Show/Hide Results Link */}
        <TouchableOpacity
          style={styles.showResultsLink}
          onPress={() => toggleExpand(group.chapterId)}
          activeOpacity={0.7}
        >
          <Text style={styles.showResultsText}>
            {isExpanded ? 'Hide Results' : `Show ${resultCount} Results`}
          </Text>
          {isExpanded ? (
            <ChevronDown size={16} color={Colors.light.tint} />
          ) : (
            <ChevronRight size={16} color={Colors.light.tint} />
          )}
        </TouchableOpacity>

        {/* Expanded Snippet List */}
        {isExpanded && (
          <View style={styles.snippetsContainer}>
            {group.results.map((result, index) => (
              <View key={`${result.id}-${index}`} style={styles.snippetItem}>
                <Text style={styles.snippetPageNumber}>p. {result.pageNumber}</Text>
                <Text style={styles.snippetText}>
                  {result.matchContext.before && `...${result.matchContext.before}`}
                  <Text style={styles.snippetMatchText}>
                    {result.matchContext.match}
                  </Text>
                  {result.matchContext.after && `${result.matchContext.after}...`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No search results found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={groupedResults}
      renderItem={renderChapterGroup}
      keyExtractor={(item) => item.chapterId}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chapterGroup: {
    marginBottom: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 12,
  },
  openButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  showResultsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  showResultsText: {
    fontSize: 14,
    color: Colors.light.tint,
    textDecorationLine: 'underline',
    marginRight: 4,
  },
  snippetsContainer: {
    marginTop: 12,
    paddingLeft: 16,
  },
  snippetItem: {
    marginBottom: 10,
    paddingVertical: 4,
  },
  snippetPageNumber: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  snippetText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  snippetMatchText: {
    fontWeight: '700',
    backgroundColor: '#FFEB3B',
    color: '#000000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
});

export default BigBookSearchResults;
