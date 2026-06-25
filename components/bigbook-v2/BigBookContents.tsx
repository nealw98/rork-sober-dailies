// Big Book — Contents page (redesign 3.0). Reskinned table of contents for the
// full 4th edition (constants/bigbook-toc.ts): grouped Front Matter / The Big
// Book / Personal Stories / Appendices, amber theme, cover hero. Each row is
// flagged text or PDF and opens the right reader — text → the in-app reader
// (onSelectText), PDF → the bundled PdfReader (onSelectPdf). Replaces the old
// BigBookChapterList.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, FileText } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { BigBookCover } from '@/components/literature/literature-ui';
import { BIGBOOK_TOC, type TocEntry } from '@/constants/bigbook-toc';
import { fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const AMBER_SOFT = '#FCF0DE';
const AMBER_INK = '#B27330';

export function BigBookContents({ onSelectText, onSelectPdf }: {
  onSelectText: (chapterId: string) => void;
  onSelectPdf: (entry: TocEntry) => void;
}) {
  const router = useRouter();
  const open = (e: TocEntry) => {
    if (e.kind === 'pdf') onSelectPdf(e);
    else if (e.chapterId) onSelectText(e.chapterId);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Alcoholics Anonymous</Text>
        <Text style={styles.sub}>Big Book · 4th edition</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[AMBER_SOFT, 'rgba(252,240,222,0)']} style={styles.hero}>
          <BigBookCover w={72} h={101} />
          <View style={styles.flex}>
            <Text style={styles.heroText}>Read the first 164 pages and appendices in the app. The later-edition forewords and the personal stories open as PDF.</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {BIGBOOK_TOC.map((g) => (
            <View key={g.label} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                {!!g.sub && <Text style={styles.groupSub}>{g.sub}</Text>}
              </View>
              {g.entries.map((e, i) => (
                <Row key={e.id} entry={e} last={i === g.entries.length - 1} onPress={() => open(e)} />
              ))}
            </View>
          ))}
          <Text style={styles.copyright}>Copyright © Alcoholics Anonymous World Services, Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ entry, last, onPress }: { entry: TocEntry; last: boolean; onPress: () => void }) {
  const isPdf = entry.kind === 'pdf';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>{entry.title}</Text>
        <View style={styles.metaRow}>
          {isPdf && (
            <View style={styles.pdfTag}>
              <FileText size={10} color={AMBER_INK} strokeWidth={2.4} />
              <Text style={styles.pdfTagText}>PDF</Text>
            </View>
          )}
          <Text style={styles.rowPage}>p. {entry.page}{entry.note ? ` · ${entry.note}` : ''}</Text>
        </View>
      </View>
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 26, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  heroText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted },
  groupSub: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  pdfTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: AMBER_SOFT },
  pdfTagText: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.4, color: AMBER_INK },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 22, lineHeight: 15 },
});
