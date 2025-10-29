/**
 * Big Book Page Navigation Component
 * 
 * Modal for "Go to Page" feature.
 * User enters page number, navigates to that page in the reader.
 * 
 * Features:
 * - Numeric input for page number
 * - Validation (page must exist)
 * - Quick page buttons (common pages)
 * - Navigate to page
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface BigBookPageNavigationProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToPage: (pageNumber: number) => { chapterId: string; paragraphId: string } | null;
}

export function BigBookPageNavigation({
  visible,
  onClose,
  onNavigateToPage,
}: BigBookPageNavigationProps) {
  const [pageInput, setPageInput] = useState('');
  const [error, setError] = useState('');

  const handlePageChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setPageInput(cleaned);
    setError('');
  };

  const handleNavigate = (pageNumber?: number) => {
    console.log('[BigBookPageNavigation] handleNavigate called');
    console.log('[BigBookPageNavigation] - pageNumber arg:', pageNumber);
    console.log('[BigBookPageNavigation] - pageInput state:', pageInput);
    
    const page = pageNumber || parseInt(pageInput, 10);
    console.log('[BigBookPageNavigation] - resolved page:', page);
    
    if (!page || isNaN(page)) {
      console.log('[BigBookPageNavigation] - Invalid page number');
      setError('Please enter a valid page number');
      return;
    }
    
    if (page < 1) {
      console.log('[BigBookPageNavigation] - Page too low');
      setError('Page number must be at least 1');
      return;
    }
    
    console.log('[BigBookPageNavigation] - Validation passed, calling onNavigateToPage');
    console.log('[BigBookPageNavigation] - onNavigateToPage type:', typeof onNavigateToPage);
    
    try {
      const result = onNavigateToPage(page);
      console.log('[BigBookPageNavigation] - onNavigateToPage result:', result);
      
      if (result === null) {
        // Page not found in content
        setError('Page not found. Valid pages: 1-164 or 565-579');
        return;
      }
      
      console.log('[BigBookPageNavigation] - onNavigateToPage called successfully');
      setPageInput('');
      setError('');
      onClose();
      console.log('[BigBookPageNavigation] - Modal closing');
    } catch (error) {
      console.error('[BigBookPageNavigation] Error calling onNavigateToPage:', error);
      setError('Error navigating to page');
    }
  };

  const handleClose = () => {
    setPageInput('');
    setError('');
    onClose();
  };

  console.log('[BigBookPageNavigation] Rendering, visible:', visible);
  console.log('[BigBookPageNavigation] pageInput:', pageInput);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
      >
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
          <Text style={styles.headerTitle}>Go to Page</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

          {/* Content - Simplified without ScrollView */}
          <View style={styles.content}>
            {/* Page Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Enter Page Number</Text>
              <TextInput
                style={styles.input}
                value={pageInput}
                onChangeText={handlePageChange}
                placeholder="Enter page number"
                placeholderTextColor={Colors.light.muted}
                keyboardType="number-pad"
                returnKeyType="go"
                onSubmitEditing={() => handleNavigate()}
                maxLength={3}
                autoFocus={true}
              />
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>

            {/* Go Button */}
            <TouchableOpacity
              style={[
                styles.goButton,
                !pageInput && styles.goButtonDisabled
              ]}
              onPress={() => handleNavigate()}
              disabled={!pageInput}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.goButtonText,
                !pageInput && styles.goButtonTextDisabled
              ]}>
                Go to Page {pageInput || '—'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
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
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    textAlign: 'center',
    minHeight: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  goButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 50,
  },
  goButtonDisabled: {
    backgroundColor: Colors.light.border || '#E5E7EB',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  goButtonTextDisabled: {
    color: Colors.light.muted,
  },
});

