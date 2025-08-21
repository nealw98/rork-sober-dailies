import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { SearchResult } from '@/constants/bigbook';

interface BigBookSearchResultsProps {
  results: SearchResult[];
  onResultPress: (result: SearchResult) => void;
}

const BigBookSearchResults = ({ results, onResultPress }: BigBookSearchResultsProps) => {
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
      <Text style={styles.resultsCount}>
        {results.length} {results.length === 1 ? 'match' : 'matches'} found
      </Text>
      
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
          
          <View style={styles.resultFooter}>
            <ExternalLink size={16} color={Colors.light.muted} />
            <Text style={styles.openText}>Open section</Text>
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
  resultsCount: {
    fontSize: 14,
    color: Colors.light.muted,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
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
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  openText: {
    fontSize: 14,
    color: Colors.light.muted,
    marginLeft: 8,
  },
});

export default BigBookSearchResults;
