import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

import Colors from "@/constants/colors";
import { twelveAndTwelveData } from "@/constants/twelve-and-twelve";
import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { TwelveAndTwelveCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";

import PDFViewer from "@/components/PDFViewer";






const SectionItem = ({ section, categoryId, onOpenPDF }: { section: BigBookSection; categoryId: string; onOpenPDF: (url: string, title: string) => void }) => {
  const { addToRecent } = useBigBookStore();

  const handlePress = () => {
    addToRecent(section.id, section.title, section.url);
    onOpenPDF(section.url, section.title);
  };

  return (
    <TouchableOpacity style={styles.sectionItem} onPress={handlePress} testID={`section-${section.id}`}>
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.description && <Text style={styles.sectionDescription}>{section.description}</Text>}
      </View>
      <ExternalLink size={16} color={Colors.light.muted} />
    </TouchableOpacity>
  );
};

const CategorySection = ({ category, onOpenPDF }: { category: TwelveAndTwelveCategory; onOpenPDF: (url: string, title: string) => void }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setExpanded(!expanded)}
        testID={`category-${category.id}`}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        {expanded ? (
          <ChevronDown size={20} color={Colors.light.muted} />
        ) : (
          <ChevronRight size={20} color={Colors.light.muted} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionsContainer}>
          {category.sections.map((section) => (
            <SectionItem key={section.id} section={section} categoryId={category.id} onOpenPDF={onOpenPDF} />
          ))}
        </View>
      )}
    </View>
  );
};





function TwelveAndTwelveBrowserContent() {
  const [pdfViewerVisible, setPdfViewerVisible] = useState<boolean>(false);
  const [currentPdf, setCurrentPdf] = useState<{ url: string; title: string } | null>(null);

  // Preload PDFs for better performance
  useEffect(() => {
    const preloadPDFs = async () => {
      // Preload the most commonly accessed PDFs (Steps 1-3, Traditions 1-3)
      const commonPDFs = [
        'https://www.aa.org/sites/default/files/2022-01/en_step1.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_step2.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_step3.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition1.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition2.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition3.pdf',
      ];

      // Use fetch to preload PDFs in the background
      commonPDFs.forEach(url => {
        fetch(url, { method: 'HEAD' }).catch(() => {
          // Silently fail - this is just for preloading
        });
      });
    };

    // Delay preloading to not interfere with initial render
    const timer = setTimeout(preloadPDFs, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenPDF = (url: string, title: string) => {
    console.log('TwelveAndTwelve handleOpenPDF called with:', { url, title });
    setCurrentPdf({ url, title });
    setPdfViewerVisible(true);
    console.log('TwelveAndTwelve PDF viewer should now be visible:', true);
  };

  const handleClosePDF = () => {
    setPdfViewerVisible(false);
    setCurrentPdf(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.header}>
            {Platform.OS !== 'android' && (
              <Text style={styles.title}>Twelve Steps and Twelve Traditions</Text>
            )}
            <Text style={styles.subtitle}>A detailed exploration of the AA program</Text>
            <Text style={styles.description}>
              Tap any section to open the official PDF from AA World Services.
            </Text>
          </View>
          
          {twelveAndTwelveData.map((category) => (
            <CategorySection key={category.id} category={category} onOpenPDF={handleOpenPDF} />
          ))}
          
          <View style={styles.copyrightContainer}>
            <Text style={styles.copyrightText}>
              Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <Modal
        visible={pdfViewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClosePDF}
      >
        {currentPdf && (
          <PDFViewer
            url={currentPdf.url}
            title={currentPdf.title}
            onClose={handleClosePDF}
          />
        )}
      </Modal>
    </View>
  );
}

export default function TwelveAndTwelveBrowser() {
  return (
    <BigBookStoreProvider>
      <TwelveAndTwelveBrowserContent />
    </BigBookStoreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight("bold", true),
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
    textAlign: "center",
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  sectionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  sectionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 16,
  },
  bookmarkButton: {
    padding: 8,
    marginLeft: 8,
  },
  bookmarksContainer: {
    padding: 16,
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  bookmarkDate: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  removeBookmarkButton: {
    padding: 8,
  },

  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});