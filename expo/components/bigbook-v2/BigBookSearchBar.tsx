/**
 * Big Book Search Bar Component
 * 
 * Search input for searching across all Big Book content.
 * Works with paragraph-based structure to find matches.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface BigBookSearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function BigBookSearchBar({ 
  onSearch, 
  onClear,
  placeholder = 'Search Big Book...',
  autoFocus = false 
}: BigBookSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search to avoid too many searches while typing
  useEffect(() => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      onSearch(query);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchIcon}>
        {isSearching ? (
          <ActivityIndicator size="small" color={Colors.light.muted} />
        ) : (
          <Search size={20} color={Colors.light.muted} />
        )}
      </View>
      
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      
      {query.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <X size={20} color={Colors.light.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    padding: 0, // Remove default padding
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

