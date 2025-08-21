import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X, ArrowLeft, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  console.log('PDFViewer rendered with URL:', url);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // For web, we can embed the PDF directly
  // For mobile, we'll use Google Docs viewer which works well in WebView
  const viewerUrl = Platform.OS === 'web' 
    ? url 
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}&zoom=150`;
  
  console.log('Using viewer URL:', viewerUrl);
  
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
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
        
        <View style={styles.headerActions}>
          {hasError && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              testID="pdf-retry-button"
            >
              <RefreshCw size={18} color={Colors.light.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            testID="pdf-x-button"
          >
            <X size={20} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load PDF</Text>
          <Text style={styles.errorMessage}>
            The PDF couldn&apos;t be loaded. This might be due to network issues or the PDF being temporarily unavailable.
          </Text>
          <TouchableOpacity style={styles.retryButtonLarge} onPress={handleRetry}>
            <RefreshCw size={20} color={Colors.light.background} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openExternalButton} onPress={() => {
            Alert.alert(
              'Open in Browser',
              'Would you like to open this PDF in your browser?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open', onPress: () => {
                  // This will open in the system browser as a fallback
                  console.log('Opening PDF in browser:', url);
                  // Note: We can't actually open the browser from here without expo-web-browser
                  // But this gives the user an option
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
          // Add some additional props for better PDF handling
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction={true}
          // Inject JavaScript to adjust the zoom level when the PDF loads
          injectedJavaScript={`
            (function() {
              // Method 1: Try to click the "Fit to page" button in Google Docs viewer
              const checkInterval = setInterval(() => {
                // Check if the viewer iframe exists
                const viewerFrame = document.querySelector('iframe');
                if (viewerFrame) {
                  try {
                    // Access the document inside the iframe
                    const viewerDoc = viewerFrame.contentDocument || viewerFrame.contentWindow.document;
                    
                    // Find the zoom controls
                    const zoomControls = viewerDoc.querySelector('.ndfHFb-c4YZDc-Wrql6b');
                    if (zoomControls) {
                      // Find and click the "Fit to page" button (typically the second button in zoom controls)
                      const fitToPageButton = viewerDoc.querySelectorAll('.ndfHFb-c4YZDc-j7LFlb')[1];
                      if (fitToPageButton) {
                        fitToPageButton.click();
                        console.log('PDF zoom adjusted to fit page');
                        clearInterval(checkInterval);
                      }
                    }
                    
                    // Method 2: Apply CSS to scale the PDF content
                    const pdfContent = viewerDoc.querySelector('.ndfHFb-c4YZDc-cYSp0e-DARUcf-PLDbbf');
                    if (pdfContent) {
                      pdfContent.style.transform = 'scale(1.5)';
                      pdfContent.style.transformOrigin = 'top center';
                      console.log('Applied CSS scaling to PDF content');
                    }
                    
                    // Method 3: Try to find and manipulate the zoom input directly
                    const zoomInput = viewerDoc.querySelector('input[aria-label="Zoom"]');
                    if (zoomInput) {
                      // Set zoom to 125% or 150%
                      zoomInput.value = '150';
                      // Trigger change event
                      const event = new Event('change', { bubbles: true });
                      zoomInput.dispatchEvent(event);
                      console.log('Set zoom input to 150%');
                    }
                  } catch (e) {
                    console.log('Error accessing iframe content:', e);
                  }
                }
              }, 1000);
              
              // Stop checking after 10 seconds to avoid infinite loop
              setTimeout(() => clearInterval(checkInterval), 10000);
            })();
          `}
        />
      )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    padding: 8,
    marginRight: 4,
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
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
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.muted,
    fontWeight: adjustFontWeight('500'),
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
  retryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    marginLeft: 8,
  },
  openExternalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openExternalText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    textDecorationLine: 'underline',
  },
});