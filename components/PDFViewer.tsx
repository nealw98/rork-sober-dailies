import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { ArrowLeft, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  console.log('PDFViewer rendered with URL:', url);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  
  // Handle potential errors with malformed URLs
  const source = { 
    uri: url, 
    cache: true,
    expiration: 0, // Never expire cached files
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onClose}
          testID="pdf-close-button"
        >
          <ArrowLeft size={20} color={Colors.light.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          testID="pdf-x-button"
        >
          <X size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.pdfContainer}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        )}
        
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to load PDF</Text>
            <Text style={styles.errorMessage}>
              The PDF couldn&apos;t be loaded. This might be due to network issues or the PDF being temporarily unavailable.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onClose}>
              <Text style={styles.retryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!hasError && <Pdf
          source={source}
          onLoadComplete={(numberOfPages, filePath) => {
            console.log(`PDF loaded with ${numberOfPages} pages`);
            setIsLoading(false);
          }}
          onPageChanged={(page, numberOfPages) => {
            console.log(`Current page: ${page}/${numberOfPages}`);
          }}
          onError={(error) => {
            console.error('PDF Error:', error);
            setIsLoading(false);
            setHasError(true);
            // Show error in console but don't crash the app
            console.warn(`Failed to load PDF: ${url}`, error);
          }}
          scale={1.5} // Set default zoom level to 150%
          fitWidth={true} // Make PDF fit the width of the screen
          style={styles.pdf}
          enablePaging={true}
          enableRTL={false}
          trustAllCerts={false}
        />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 4,
    fontWeight: adjustFontWeight('500'),
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  closeButton: {
    padding: 8,
  },
  pdfContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    zIndex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.muted,
    fontWeight: adjustFontWeight('500'),
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
});