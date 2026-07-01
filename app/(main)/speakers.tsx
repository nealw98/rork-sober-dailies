// Speaker Tapes — Library (redesign 3.0). Reskinned to the prototype's lavender
// "mic-art" world (frames/hifi-speaker-v2.jsx · SpeakerLibrary / TapeRow):
// a gradient featured hero, gradient tape thumbnails, search, a sort menu, and an
// All / Saved / Offline segment filter. Data: useSpeakers (Supabase) + the global
// audio player + downloads + the local favorites store. Net-new: Saved filter.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus, StyleSheet, View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Search, X, Mic, Play, Bookmark, CircleCheck, ChevronDown, Check } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useSpeakers, Speaker } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useDownloadedSpeakerIds } from '@/hooks/useSpeakerDownload';
import { useSpeakerFavorites } from '@/hooks/use-speaker-favorites';
import { colors, fontFamily, getSemanticColors, shadows, families } from '@/constants/designTokens';

const c = getSemanticColors('light');
// Steel Navy, one ramp step lighter than the global steel — the speaker pages
// read too dark at the full strength.
const MT = families.steel[400];           // was steel[500]
const MT_DARK = families.steel[600];      // was steel[700]
const MT_SOFT = families.steel[100];

// Mic-art is a flat Steel Navy fill (gradient removed).

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1];
  return `${M} ${parseInt(d, 10)}, ${y}`;
}
const stripQuote = (q?: string | null) => (q ? q.replace(/^["“]|["”]$/g, '') : '');

type Filter = 'All' | 'Saved' | 'Offline';
type SortKey = 'newest' | 'oldest' | 'az';
const SORT_LABEL: Record<SortKey, string> = { newest: 'Recently added', oldest: 'Oldest first', az: 'Speaker A–Z' };

function sortSpeakers(list: Speaker[], sortBy: SortKey): Speaker[] {
  const s = [...list];
  const time = (d: string | null) => (d ? new Date(d).getTime() : null);
  if (sortBy === 'az') return s.sort((a, b) => a.speaker.localeCompare(b.speaker));
  return s.sort((a, b) => {
    const ta = time(a.date), tb = time(b.date);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return sortBy === 'newest' ? tb - ta : ta - tb;
  });
}

// ─── Gradient mic-art thumbnail ──────────────────────────────────────────────
function MicThumb({ size, radius }: { id: string; size: number; radius: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: MT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Mic size={size * 0.42} color="rgba(255,255,255,0.55)" strokeWidth={1.3} />
    </View>
  );
}

// ─── Featured hero (gradient quote card) ─────────────────────────────────────
function FeaturedHero({ tape, onOpen, onPlay }: { tape: Speaker; onOpen: () => void; onPlay: () => void }) {
  const quote = stripQuote(tape.quote) || tape.subtitle || '';
  return (
    <Pressable onPress={onOpen} style={styles.featuredWrap}>
      <View style={[styles.featuredCard, { backgroundColor: MT }]}>
        <View style={styles.featuredTop}>
          <Text style={styles.featuredEyebrow}>FEATURED · THIS WEEK</Text>
          <Text style={styles.featuredMeta} numberOfLines={1}>{[tape.hometown, fmtDate(tape.date)].filter(Boolean).join(' · ')}</Text>
        </View>
        {!!quote && (
          <Text style={styles.featuredQuote} numberOfLines={4}>
            <Text style={styles.featuredQuoteMark}>“</Text>{quote}<Text style={styles.featuredQuoteMark}>”</Text>
          </Text>
        )}
        <View style={styles.featuredFooter}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.featuredSpeaker} numberOfLines={1}>{tape.speaker}</Text>
            <Text style={styles.featuredTitle} numberOfLines={1}>{tape.title}</Text>
          </View>
          <Pressable onPress={onPlay} hitSlop={6} style={styles.featuredPlay} accessibilityLabel={`Play ${tape.speaker}`}>
            <Play size={22} color={MT_DARK} fill={MT_DARK} style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Tape row ────────────────────────────────────────────────────────────────
function TapeRow({ tape, saved, downloaded, onOpen, onPlay, onToggleSave }: { tape: Speaker; saved: boolean; downloaded: boolean; onOpen: () => void; onPlay: () => void; onToggleSave: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowBody} onPress={onOpen}>
        <MicThumb id={tape.id} size={56} radius={12} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowNameLine}>
            <Text style={styles.rowSpeaker} numberOfLines={1}>{tape.speaker}</Text>
            <Text style={styles.rowHometown} numberOfLines={1}>{tape.hometown}</Text>
          </View>
          <Text style={styles.rowTitle} numberOfLines={1}>{tape.title}</Text>
          {tape.subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{tape.subtitle}</Text> : null}
          <View style={styles.rowMeta}>
            {fmtDate(tape.date) ? <Text style={styles.rowMetaText}>{fmtDate(tape.date)}</Text> : null}
            {downloaded ? <CircleCheck size={13} color={colors.primary} /> : null}
            <Pressable onPress={onToggleSave} hitSlop={10} accessibilityLabel={saved ? `Unsave ${tape.speaker}` : `Save ${tape.speaker}`}>
              <Bookmark size={14} color={saved ? MT : c.textMuted} fill={saved ? MT : 'transparent'} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onPlay} hitSlop={6} style={styles.rowPlay} accessibilityLabel={`Play ${tape.speaker}`}>
        <Play size={15} color={MT_DARK} fill={MT_DARK} style={{ marginLeft: 2 }} />
      </Pressable>
    </View>
  );
}

export default function SpeakersScreen() {
  const { speakers, isLoading } = useSpeakers();
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  const player = useGlobalAudioPlayer();
  const { downloadedIds, refresh: refreshDownloads } = useDownloadedSpeakerIds();
  const { isSaved, toggleSaved, savedIds } = useSpeakerFavorites();
  useScreenTimeTracking('Speakers');

  useFocusEffect(useCallback(() => { refreshDownloads(); }, [refreshDownloads]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => { if (s === 'active') refreshDownloads(); });
    return () => sub.remove();
  }, [refreshDownloads]);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const list = useMemo(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const match = (s: Speaker) => {
      if (filter === 'Saved' && !savedSet.has(s.id)) return false;
      if (filter === 'Offline' && !downloadedIds.has(s.id)) return false;
      if (!terms.length) return true;
      const hay = [s.speaker, s.title, s.subtitle, s.hometown, s.core_themes].map((x) => (x || '').toLowerCase()).join(' ');
      return terms.every((t) => new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(hay));
    };
    return sortSpeakers(speakers.filter(match), sortBy);
  }, [speakers, q, filter, sortBy, savedSet, downloadedIds]);

  const showFeatured = filter === 'All' && !q.trim() && sortBy === 'newest';
  const featured = showFeatured ? sortSpeakers(speakers, 'newest')[0] : undefined;
  const rows = featured ? list.filter((t) => t.id !== featured.id) : list;

  const openDetail = useCallback((s: Speaker, autoplay?: boolean) => {
    router.push({ pathname: '/(main)/speaker-detail', params: autoplay ? { id: s.id, autoplay: '1' } : { id: s.id } } as any);
  }, []);

  const counts = useMemo(() => ({
    All: speakers.length,
    Saved: speakers.filter((s) => savedSet.has(s.id)).length,
    Offline: speakers.filter((s) => downloadedIds.has(s.id)).length,
  }), [speakers, savedSet, downloadedIds]);

  const renderItem = useCallback(({ item }: { item: Speaker }) => (
    <TapeRow
      tape={item}
      saved={savedSet.has(item.id)}
      downloaded={downloadedIds.has(item.id)}
      onOpen={() => openDetail(item)}
      onPlay={() => openDetail(item, true)}
      onToggleSave={() => toggleSaved(item.id)}
    />
  ), [savedSet, downloadedIds, openDetail, toggleSaved]);

  const ListHeader = (
    <View>
      {searchOpen && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Search size={16} color={c.textMuted} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="Search speakers, topics…"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {q ? <Pressable hitSlop={8} onPress={() => setQ('')}><X size={15} color={c.textMuted} strokeWidth={2.2} /></Pressable> : null}
          </View>
        </View>
      )}

      <View style={styles.filterRow}>
        {(['All', 'Saved', 'Offline'] as Filter[]).map((f) => {
          const on = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, on ? styles.filterChipOn : styles.filterChipOff]}>
              <Text style={[styles.filterText, { color: on ? '#fff' : c.textSecondary }]}>{f}</Text>
              <Text style={[styles.filterCount, { color: on ? 'rgba(255,255,255,0.75)' : c.textMuted }]}>{counts[f]}</Text>
            </Pressable>
          );
        })}
      </View>

      {featured && <FeaturedHero tape={featured} onOpen={() => openDetail(featured)} onPlay={() => openDetail(featured, true)} />}

      <View style={styles.listLabelRow}>
        <Text style={styles.listLabel}>{showFeatured ? 'RECENTLY ADDED' : `${rows.length} ${rows.length === 1 ? 'TAPE' : 'TAPES'}`}</Text>
        <Pressable onPress={() => setSortOpen(true)} style={styles.sortBtn} hitSlop={8}>
          <Text style={styles.sortBtnText}>{SORT_LABEL[sortBy]}</Text>
          <ChevronDown size={14} color={MT_DARK} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Speaker Tapes</Text>
          <Pressable onPress={() => setSearchOpen((o) => !o)} style={[styles.searchToggle, searchOpen && styles.searchToggleOn]} hitSlop={6} accessibilityLabel="Search">
            <Search size={17} color={searchOpen ? '#fff' : c.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={MT} /></View>
      ) : (
        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(s) => s.id}
          extraData={[savedSet, downloadedIds, player.currentSpeakerId, player.isPlaying]}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{q.trim() ? `No tapes match “${q.trim()}”.` : filter === 'Saved' ? 'No saved tapes yet.' : 'Nothing here yet.'}</Text>
              <Text style={styles.emptySub}>{filter !== 'All' ? 'Try the All filter, or a different search.' : 'Try a different search.'}</Text>
            </View>
          }
        />
      )}

      {/* Sort menu */}
      <Modal transparent visible={sortOpen} animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sortCard}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k, i) => {
              const on = sortBy === k;
              return (
                <Pressable key={k} onPress={() => { setSortBy(k); setSortOpen(false); }} style={[styles.sortItem, i > 0 && styles.sortItemDivider, on && { backgroundColor: MT_SOFT }]}>
                  <Text style={[styles.sortItemText, { color: on ? MT_DARK : c.text }]}>{SORT_LABEL[k]}</Text>
                  {on ? <Check size={15} color={MT_DARK} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5, color: c.text },
  searchToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  searchToggleOn: { backgroundColor: c.text, borderColor: c.text },

  listContent: { paddingHorizontal: 16, paddingBottom: 120 },

  // search
  searchWrap: { paddingTop: 6, paddingBottom: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14, color: c.text, padding: 0 },

  // segment filter
  filterRow: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingBottom: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  filterChipOn: { backgroundColor: c.text },
  filterChipOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  filterText: { fontFamily: fontFamily.semiBold, fontSize: 13 },
  filterCount: { fontFamily: fontFamily.regular, fontSize: 11 },

  // featured hero
  featuredWrap: { marginTop: 14 },
  featuredCard: { borderRadius: 20, overflow: 'hidden', paddingTop: 16, ...shadows.lg, shadowColor: MT },
  featuredTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 },
  featuredEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.92)' },
  featuredMeta: { fontFamily: fontFamily.semiBold, fontSize: 9.5, letterSpacing: 1, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  featuredQuote: { fontFamily: fontFamily.serifItalic, fontSize: 20, lineHeight: 27, color: '#fff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  featuredQuoteMark: { color: 'rgba(255,255,255,0.45)' },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  featuredSpeaker: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: '#fff' },
  featuredTitle: { fontFamily: fontFamily.serifItalic, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  featuredPlay: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md },

  // list label + sort
  listLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 4 },
  listLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.6, color: c.textMuted },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: MT_DARK },

  // tape row
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12, minWidth: 0 },
  rowNameLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowSpeaker: { fontFamily: fontFamily.displayBold, fontSize: 18, letterSpacing: -0.3, color: c.text, flexShrink: 1 },
  rowHometown: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted, letterSpacing: 0.3 },
  rowTitle: { fontFamily: fontFamily.serifItalic, fontSize: 14, color: c.textSecondary, marginTop: 3 },
  rowSubtitle: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 5 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  rowMetaText: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, letterSpacing: 0.3 },
  rowPlay: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: MT, backgroundColor: MT_SOFT, alignItems: 'center', justifyContent: 'center' },

  // sort menu
  sortBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,30,0.18)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 150, paddingHorizontal: 20 },
  sortCard: { width: 210, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...shadows.lg },
  sortItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  sortItemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
  sortItemText: { fontFamily: fontFamily.semiBold, fontSize: 13 },

  // states
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: c.textSecondary, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center' },
});
