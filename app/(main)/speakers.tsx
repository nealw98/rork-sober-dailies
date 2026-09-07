// Speaker Tapes — Library (redesign 3.0). Reskinned to the prototype's lavender
// "mic-art" world (frames/hifi-speaker-v2.jsx · SpeakerLibrary / TapeRow):
// a gradient featured hero, gradient tape thumbnails, search, a sort menu, and an
// All / Saved / Offline segment filter. Data: useSpeakers (Supabase) + the global
// audio player + downloads + the local favorites store. Net-new: Saved filter.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus, StyleSheet, View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Search, X, Mic, Play, Pause, Bookmark, CircleCheck, ChevronDown, Check } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useSpeakers, Speaker } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useDownloadedSpeakerIds } from '@/hooks/useSpeakerDownload';
import { useSpeakerFavorites } from '@/hooks/use-speaker-favorites';
import { EqualizerOverlay } from '@/components/EqualizerOverlay';
import { fontFamily, shadows, families, steelFill, steelPlay, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

// Speaker-page steel, mode-resolved. Light keeps the "one ramp step lighter"
// values (steel[400]/[600]/[100]); dark uses the handoff specials: steelFill for
// solids under white, the brightened steel for inks/accents, low-alpha soft wash,
// and steelPlay for the play triangles.
const steelSp = (tk: Tokens) => ({
  fill: tk.isDark ? steelFill.dark : families.steel[400],      // solid fills carrying white
  ink: tk.isDark ? tk.colors.steelDark : families.steel[600],  // text/icon ink (was MT_DARK)
  soft: tk.isDark ? tk.colors.steelSoft : families.steel[100],
  accent: tk.isDark ? tk.colors.steel : families.steel[400],   // saved bookmark, spinners
  play: tk.isDark ? steelPlay.dark : families.steel[600],      // play triangle
});

// Mic-art is a flat Steel Navy fill (gradient removed).

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1];
  return `${M} ${parseInt(d, 10)}, ${y}`;
}
function fmtDuration(seconds?: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)} min ${total % 60} sec`;
}
function fmtFeaturedDuration(seconds?: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} m` : `${hours} h`;
}
function fmtRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} left`;
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
function MicThumb({ size, radius, active = false, playing = false }: { id: string; size: number; radius: number; active?: boolean; playing?: boolean }) {
  const sp = steelSp(useTokens());
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: active ? families.steel[700] : sp.fill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {active ? <View style={{ width: size * 0.48, height: size * 0.36 }}><EqualizerOverlay isPlaying={playing} barCount={4} barColor="#fff" /></View> : <Mic size={size * 0.42} color="rgba(255,255,255,0.55)" strokeWidth={1.3} />}
    </View>
  );
}

// ─── Featured hero (gradient quote card) ─────────────────────────────────────
function FeaturedHero({ tape, onOpen, onPlay, isActive, isPlaying }: { tape: Speaker; onOpen: () => void; onPlay: () => void; isActive: boolean; isPlaying: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const sp = steelSp(useTokens());
  const quote = stripQuote(tape.quote) || tape.subtitle || '';
  return (
    <Pressable onPress={onOpen} style={styles.featuredWrap}>
      <View style={[styles.featuredCard, { backgroundColor: sp.fill }]}>
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
          <Pressable onPress={isActive ? onOpen : onPlay} hitSlop={6} style={styles.featuredPlay} accessibilityLabel={isActive ? `Open ${tape.speaker}` : `Play ${tape.speaker}`}>
            {isActive ? <><View style={styles.featuredPlaybackEq}><EqualizerOverlay isPlaying={isPlaying} barCount={4} barColor={sp.play} /></View><Text style={styles.featuredPlayText}>{isPlaying ? 'Playing' : 'Paused'}</Text></> : <><Play size={16} color={sp.play} fill={sp.play} /><Text style={styles.featuredPlayText} numberOfLines={1}>Play{fmtFeaturedDuration(tape.duration_seconds) ? ` · ${fmtFeaturedDuration(tape.duration_seconds)}` : ''}</Text></>}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Tape row ────────────────────────────────────────────────────────────────
function TapeRow({ tape, saved, downloaded, isActive, isPlaying, onOpen }: { tape: Speaker; saved: boolean; downloaded: boolean; isActive: boolean; isPlaying: boolean; onOpen: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const tk = useTokens();
  const sp = steelSp(tk);
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowBody} onPress={onOpen}>
        <MicThumb id={tape.id} size={56} radius={12} active={isActive} playing={isPlaying} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowNameLine}>
            <Text style={styles.rowSpeaker} numberOfLines={1}>{tape.speaker}</Text>
            <Text style={styles.rowHometown} numberOfLines={1}>{tape.hometown}</Text>
          </View>
          <Text style={styles.rowTitle} numberOfLines={1}>{tape.title}</Text>
          {tape.subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{tape.subtitle}</Text> : null}
          <View style={styles.rowMeta}>
            {[fmtDuration(tape.duration_seconds), fmtDate(tape.date)].filter(Boolean).length ? <Text style={styles.rowMetaText}>{[fmtDuration(tape.duration_seconds), fmtDate(tape.date)].filter(Boolean).join(' · ')}</Text> : null}
            {downloaded ? <CircleCheck size={13} color={tk.colors.primary} /> : null}
            {saved ? <Bookmark size={14} color={sp.accent} fill={sp.accent} strokeWidth={2} /> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function MiniPlayer({ speaker, onOpen }: { speaker: Speaker; onOpen: () => void }) {
  const player = useGlobalAudioPlayer();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const remaining = Math.max(0, player.durationMs - player.positionMs);
  const progress = player.durationMs > 0 ? player.positionMs / player.durationMs : 0;
  return (
    <View style={[styles.miniDock, { bottom: Math.max(insets.bottom, 16) + 4 }]}>
      <View style={styles.miniProgressTrack}><View style={[styles.miniProgressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
      <Pressable style={styles.miniBody} onPress={onOpen} accessibilityLabel={`Open ${speaker.speaker} player`}>
        <MicThumb id={speaker.id} size={44} radius={11} active playing={player.isPlaying} />
        <View style={styles.miniText}>
          <Text numberOfLines={1}><Text style={styles.miniName}>{speaker.speaker}</Text><Text style={styles.miniTitle}> · {speaker.title}</Text></Text>
          <Text style={styles.miniSub}>{player.isPlaying ? 'Now playing' : 'Paused'} · {fmtRemaining(remaining)}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.miniToggle} onPress={player.isPlaying ? player.pause : player.play} accessibilityLabel={player.isPlaying ? 'Pause' : 'Resume'}>
        {player.isPlaying ? <Pause size={20} color="#fff" fill="#fff" /> : <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />}
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

  const styles = useThemedStyles(makeStyles);
  const tk = useTokens();
  const { c, isDark } = tk;
  const sp = steelSp(tk);

  const player = useGlobalAudioPlayer();
  const { downloadedIds, refresh: refreshDownloads } = useDownloadedSpeakerIds();
  const { savedIds } = useSpeakerFavorites();
  useScreenTimeTracking('Speakers');

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(main)/(tabs)/tools');
  }, []);

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
  // Featured rotates weekly (Monday rollover): pick from the catalog in a
  // stable id order, indexed by the week number — deterministic, same tape all
  // week for everyone, cycles the whole catalog before repeating.
  const featured = useMemo(() => {
    if (!showFeatured || !speakers.length) return undefined;
    const stable = [...speakers].sort((a, b) => a.id.localeCompare(b.id));
    const week = Math.floor((Math.floor(Date.now() / 86400000) + 3) / 7);
    return stable[week % stable.length];
  }, [showFeatured, speakers]);
  const rows = featured ? list.filter((t) => t.id !== featured.id) : list;

  const openDetail = useCallback((s: Speaker, autoplay = false) => {
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
      isActive={player.isLoaded && player.currentSpeakerId === item.id}
      isPlaying={player.isPlaying}
      onOpen={() => openDetail(item)}
    />
  ), [savedSet, downloadedIds, openDetail, player.isLoaded, player.currentSpeakerId, player.isPlaying]);

  const activeSpeaker = player.isLoaded ? speakers.find((s) => s.id === player.currentSpeakerId) ?? null : null;

  const chipOnText = '#fff';
  const chipOnCount = 'rgba(255,255,255,0.75)';

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
              keyboardAppearance={isDark ? 'dark' : 'light'}
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
              <Text style={[styles.filterText, { color: on ? chipOnText : c.textSecondary }]}>{f}</Text>
              <Text style={[styles.filterCount, { color: on ? chipOnCount : c.textMuted }]}>{counts[f]}</Text>
            </Pressable>
          );
        })}
      </View>

      {featured && (
        <FeaturedHero
          tape={featured}
          onOpen={() => openDetail(featured)}
          onPlay={() => openDetail(featured, true)}
          isActive={player.isLoaded && player.currentSpeakerId === featured.id}
          isPlaying={player.isPlaying}
        />
      )}

      <View style={styles.listLabelRow}>
        <Pressable onPress={() => setSortOpen(true)} style={styles.sortBtn} hitSlop={8}>
          <Text style={styles.sortBtnText}>{SORT_LABEL[sortBy]}</Text>
          <ChevronDown size={14} color={sp.ink} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={goBack} style={{ marginBottom: 8 }} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Speaker Tapes</Text>
          <Pressable onPress={() => setSearchOpen((o) => !o)} style={[styles.searchToggle, searchOpen && styles.searchToggleOn]} hitSlop={6} accessibilityLabel="Search">
            <Search size={17} color={searchOpen ? (isDark ? '#0B0C0E' : '#fff') : c.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={sp.accent} /></View>
      ) : (
        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(s) => s.id}
          extraData={[savedSet, downloadedIds, player.currentSpeakerId, player.isPlaying]}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, activeSpeaker && styles.listContentPlaying]}
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

      {activeSpeaker ? <MiniPlayer speaker={activeSpeaker} onOpen={() => openDetail(activeSpeaker)} /> : null}

      {/* Sort menu */}
      <Modal transparent visible={sortOpen} animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sortCard}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k, i) => {
              const on = sortBy === k;
              return (
                <Pressable key={k} onPress={() => { setSortBy(k); setSortOpen(false); }} style={[styles.sortItem, i > 0 && styles.sortItemDivider, on && { backgroundColor: sp.soft }]}>
                  <Text style={[styles.sortItemText, { color: on ? sp.ink : c.text }]}>{SORT_LABEL[k]}</Text>
                  {on ? <Check size={15} color={sp.ink} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const sp = steelSp(tk);
  // Cheap dark card chrome — lit top hairline + hairline border (handoff).
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
  searchToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
  searchToggleOn: { backgroundColor: c.text, borderColor: c.text },

  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  listContentPlaying: { paddingBottom: 230 },

  // search
  searchWrap: { paddingTop: 6, paddingBottom: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14, color: c.text, padding: 0 },

  // segment filter — selected uses the same steel fill as the featured card.
  filterRow: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingBottom: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  filterChipOn: { backgroundColor: sp.fill },
  filterChipOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
  filterText: { fontFamily: fontFamily.semiBold, fontSize: 13 },
  filterCount: { fontFamily: fontFamily.regular, fontSize: 11 },

  // featured hero — solid steel fill carrying white (steelFill.dark on dark)
  featuredWrap: { marginTop: 14 },
  featuredCard: { borderRadius: 20, overflow: 'hidden', paddingTop: 16, ...shadows.lg, shadowColor: isDark ? '#000' : sp.fill },
  featuredTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 },
  featuredEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.92)' },
  featuredMeta: { fontFamily: fontFamily.semiBold, fontSize: 9.5, letterSpacing: 1, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  featuredQuote: { fontFamily: fontFamily.serifItalic, fontSize: 20, lineHeight: 27, color: '#fff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  featuredQuoteMark: { color: 'rgba(255,255,255,0.45)' },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  featuredSpeaker: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: '#fff' },
  featuredTitle: { fontFamily: fontFamily.serifItalic, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  // Play chip: white circle w/ dark triangle on light; on dark it becomes a lit
  // surface chip and the triangle flips to steelPlay.dark (handoff).
  featuredPlay: { minHeight: 52, borderRadius: 26, paddingHorizontal: 16, flexDirection: 'row', gap: 7, flexShrink: 0, backgroundColor: isDark ? c.surface : '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md, ...(isDark ? { borderWidth: 1, ...darkCard } : null) },
  featuredPlayText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: sp.play },

  // list label + sort
  listLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 18, marginBottom: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: sp.ink },

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
  featuredPlaybackEq: { width: 38, height: 18 },

  miniDock: { position: 'absolute', left: 16, right: 16, minHeight: 76, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, overflow: 'hidden', ...shadows.lg, ...(isDark ? darkCard : null) },
  miniProgressTrack: { position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: c.divider },
  miniProgressFill: { height: 3, backgroundColor: families.steel[700] },
  miniBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  miniText: { flex: 1, minWidth: 0 },
  miniName: { fontFamily: fontFamily.displayBold, fontSize: 15.5, color: c.text },
  miniTitle: { fontFamily: fontFamily.serifItalic, fontSize: 14.5, color: c.text },
  miniSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  miniToggle: { width: 44, height: 44, borderRadius: 22, backgroundColor: families.steel[700], alignItems: 'center', justifyContent: 'center' },

  // sort menu
  sortBackdrop: { flex: 1, backgroundColor: isDark ? c.overlay : 'rgba(20,18,30,0.18)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 150, paddingHorizontal: 20 },
  sortCard: { width: 210, backgroundColor: isDark ? c.surface : '#fff', borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...shadows.lg, ...darkCard },
  sortItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  sortItemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
  sortItemText: { fontFamily: fontFamily.semiBold, fontSize: 13 },

  // states
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: c.textSecondary, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center' },
  });
};
