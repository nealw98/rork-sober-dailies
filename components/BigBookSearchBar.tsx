import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface BigBookSearchBarProps {
  onSearch: (query: string) => void;
  clearSearch?: boolean;
}

const BigBookSearchBar = ({ onSearch, clearSearch }: BigBookSearchBarProps) => {
  const [query, setQuery] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  // Clear search when clearSearch prop is true
  useEffect(() => {
    if (clearSearch) {
      setQuery('');
    }
  }, [clearSearch]);

  // Auto-search with minimum 2 characters, no delay
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Instant search with minimum 2 characters
    if (query.trim().length >= 2) {
      onSearch(query.trim()); // No delay - instant search
    } else if (query.trim().length === 0) {
      onSearch(''); // Clear results when empty
    }

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, onSearch]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Search size={20} color={Colors.light.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search text"
            placeholderTextColor={Colors.light.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No padding since it's now contained within searchContainer
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    height: '100%',
    ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
  },

});

export default BigBookSearchBar;