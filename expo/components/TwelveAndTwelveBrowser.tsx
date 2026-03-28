import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from "@/constants/colors";
import { twelveAndTwelveData } from "@/constants/twelve-and-twelve";
import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { TwelveAndTwelveCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";
import { useTextSettings } from "@/hooks/use-text-settings";

import PDFViewer from "@/components/PDFViewer";

interface SectionProps {
  title: string;
  sections: BigBookSection[];
  onOpenPDF: (url: string, title: string) => void;
  fontSize: number;
}

function CategorySection({ title, sections, onOpenPDF, fontSize }: SectionProps) {
  const { addToRecent } = useBigBookStore();

  const handlePress = (section: BigBookSection) => {
    addToRecent(section.id, section.title, section.url);
    onOpenPDF(section.url, section.title);
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>{title}</Text>
      
      <View style={styles.listContainer}>
        {sections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.listRow,
              index === sections.length - 1 && styles.listRowLast
            ]}
            onPress={() => handlePress(section)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowTitle, { fontSize }]}>{section.title}</Text>
            <View style={styles.rowRight}>
              {section.pageNumber && (
                <Text style={styles.pageNumber}>{section.pageNumber}</Text>
              )}
              <ChevronRight size={18} color="#a0a0a0" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TwelveAndTwelveBrowserContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontSize } = useTextSettings();
  const [pdfViewerVisible, setPdfViewerVisible] = useState<boolean>(false);
  const [currentPdf, setCurrentPdf] = useState<{ url: string; title: string } | null>(null);

  // Preload PDFs for better performance
  useEffect(() => {
    const preloadPDFs = async () => {
      const commonPDFs = [
        'https://www.aa.org/sites/default/files/2022-01/en_step1.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_step2.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_step3.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition1.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition2.pdf',
        'https://www.aa.org/sites/default/files/2022-01/en_tradition3.pdf',
      ];

      commonPDFs.forEach(url => {
        fetch(url, { method: 'HEAD' }).catch(() => {});
      });
    };

    const timer = setTimeout(preloadPDFs, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenPDF = (url: string, title: string) => {
    setCurrentPdf({ url, title });
    setPdfViewerVisible(true);
  };

  const handleClosePDF = () => {
    setPdfViewerVisible(false);
    setCurrentPdf(null);
  };

  const handleBack = () => {
    router.push('/literature');
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
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Twelve Steps & Twelve Traditions</Text>
      </LinearGradient>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {twelveAndTwelveData.map((category) => (
          <CategorySection 
            key={category.id} 
            title={category.title}
            sections={category.sections}
            onOpenPDF={handleOpenPDF}
            fontSize={fontSize}
          />
        ))}
        
        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>
            Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
          </Text>
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
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: adjustFontWeight('600'),
    color: '#6b7c8a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  listContainer: {
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 139, 139, 0.3)',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNumber: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  copyrightContainer: {
    marginTop: 8,
    paddingBottom: 32,
  },
  copyrightText: {
    fontSize: 12,
    color: '#6b7c8a',
    textAlign: "center",
    lineHeight: 16,
  },
});
