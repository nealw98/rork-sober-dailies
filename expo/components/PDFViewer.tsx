import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  console.log('PDFViewer rendered with URL:', url);
  const insets = useSafeAreaInsets();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // For iOS, use native PDF rendering (clean interface, good zoom)
  // For Android, use Google Docs viewer for now
  // For web, embed PDF directly
  const viewerUrl = Platform.OS === 'ios'
    ? url
    : Platform.OS === 'android'
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}&cache=1`
    : url;
  
  console.log('Using viewer URL:', viewerUrl);
  
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onClose}
            activeOpacity={0.7}
            testID="pdf-close-button"
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          {hasError && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              activeOpacity={0.7}
              testID="pdf-retry-button"
            >
              <RefreshCw size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
      </LinearGradient>
      
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load PDF</Text>
          <Text style={styles.errorMessage}>
            The PDF couldn&apos;t be loaded. This might be due to network issues or the PDF being temporarily unavailable.
          </Text>
          <TouchableOpacity style={styles.retryButtonLarge} onPress={handleRetry}>
            <RefreshCw size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openExternalButton} onPress={() => {
            Alert.alert(
              'Open in Browser',
              'Would you like to open this PDF in your browser?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open', onPress: () => {
                  console.log('Opening PDF in browser:', url);
                }}
              ]
            );
          }}>
            <Text style={styles.openExternalText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          key={hasError ? 'error' : 'normal'} // Force re-render on retry
          source={{ uri: viewerUrl }}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3D8B8B" />
              <Text style={styles.loadingText}>Loading PDF...</Text>
            </View>
          )}
          onLoadStart={() => {
            console.log('WebView load started');
            setIsLoading(true);
          }}
          onLoadEnd={() => {
            console.log('WebView load ended');
            setIsLoading(false);
          }}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error: ', nativeEvent);
            setHasError(true);
            setIsLoading(false);
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error: ', nativeEvent);
            setHasError(true);
            setIsLoading(false);
          }}
          onShouldStartLoadWithRequest={(request) => {
            console.log('WebView load request:', request.url);
            return true;
          }}
          onNavigationStateChange={(navState) => {
            console.log('WebView navigation state:', navState.url, 'loading:', navState.loading);
          }}
          allowsFullscreenVideo={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction={true}
          // Performance optimizations for PDF viewing
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          incognito={false}
          // Disable unnecessary features for PDF viewing
          allowsBackForwardNavigationGestures={false}
          bounces={false}
          scrollEnabled={true}
          // Optimize for PDF rendering
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6f8',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7c8a',
    fontWeight: adjustFontWeight('500'),
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f6f8',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7c8a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3D8B8B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    marginLeft: 8,
  },
  openExternalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openExternalText: {
    color: '#3D8B8B',
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    textDecorationLine: 'underline',
  },
});
