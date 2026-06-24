// Twelve & Twelve (redesign 3.0), per hifi-literature.jsx Screen1212: lavender
// theme, hero strip with the cover, grouped Intro / Twelve Steps / Twelve
// Traditions list. Each row shows the Step/Tradition's one-line summary and its
// page, and opens the official A.A. PDF in a viewer. The 12 & 12 is under
// copyright, so the text is never hardcoded — only linked. (PDF.js + a bundled
// full-book PDF with whole-book search is the planned follow-up.)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import PdfReader from '@/components/PdfReader';
import { TwelveCover } from '@/components/literature/literature-ui';
import { twelveAndTwelveData } from '@/constants/twelve-and-twelve';
import { TWELVE_PDFS } from '@/constants/twelve-and-twelve-pdfs';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const LAV_SOFT = colors.tertiarySoft; // #E9E0F6

type Section = { id: string; title: string; url: string; description?: string; pageNumber?: string };

export default function TwelveAndTwelveScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('12 Steps & 12 Traditions');
  const router = useRouter();
  const [pdf, setPdf] = useState<{ id: string; title: string } | null>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Twelve &amp; Twelve</Text>
        <Text style={styles.sub}>Steps and Traditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero strip */}
        <LinearGradient colors={[LAV_SOFT, 'rgba(233,224,246,0)']} style={styles.hero}>
          <TwelveCover w={72} h={101} />
          <View style={styles.flex}>
            <Text style={styles.heroText}>Essays on A.A.’s 24 basic principles — a chapter on each of the Twelve Steps and Twelve Traditions, interpreting them for personal recovery and group life.</Text>
          </View>
        </LinearGradient>

        {/* Grouped Step / Tradition list */}
        <View style={styles.body}>
          {twelveAndTwelveData.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>{group.title.toUpperCase()}</Text>
              {(group.sections as Section[]).map((s, i) => (
                <TTRow
                  key={s.id}
                  section={s}
                  last={i === group.sections.length - 1}
                  onOpen={() => setPdf({ id: s.id, title: s.title })}
                />
              ))}
            </View>
          ))}
          <Text style={styles.copyright}>Copyright © 1952, 1953, 1981 by Alcoholics Anonymous World Services, Inc.</Text>
        </View>
      </ScrollView>

      <Modal visible={!!pdf} animationType="slide" onRequestClose={() => setPdf(null)} presentationStyle="fullScreen">
        {pdf && TWELVE_PDFS[pdf.id] != null && (
          <PdfReader assetModule={TWELVE_PDFS[pdf.id]} title={pdf.title} onClose={() => setPdf(null)} />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function TTRow({ section, last, onOpen }: { section: Section; last: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{section.title}</Text>
        {!!section.description && <Text style={styles.rowLine} numberOfLines={1}>{section.description}</Text>}
      </View>
      {!!section.pageNumber && <Text style={styles.rowPage}>{section.pageNumber}</Text>}
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 28, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  heroText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 14 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  rowLine: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, flexShrink: 0 },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 15 },
});
