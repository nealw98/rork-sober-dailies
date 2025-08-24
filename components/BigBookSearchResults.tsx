import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
// Removed ExternalLink import - no longer needed
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { EnhancedSearchResult } from '@/constants/bigbook';

interface BigBookSearchResultsProps {
  results: EnhancedSearchResult[];
  onResultPress: (result: EnhancedSearchResult) => void;
  onDone: () => void;
}

const BigBookSearchResults = ({ results, onResultPress, onDone }: BigBookSearchResultsProps) => {
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
      
      {results.map((result, index) => (
        <TouchableOpacity
          key={`${result.id}-${index}`}
          style={styles.resultItem}
          onPress={() => onResultPress(result)}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            {result.pageNumber && (
              <Text style={styles.pageNumber}>Page {result.pageNumber}</Text>
            )}
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
        </TouchableOpacity>
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
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    backgroundColor: Colors.light.cardBackground,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    flex: 1,
  },
  pageNumber: {
    fontSize: 14,
    color: Colors.light.muted,
    marginLeft: 8,
  },
  excerptContainer: {
    marginBottom: 8,
  },
  excerptText: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
  },
  matchText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('700'),
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    lineHeight: 20,
  },
});

export default BigBookSearchResults;
