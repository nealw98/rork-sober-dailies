// Speaker player — reskinned to the prototype (frames/hifi-speaker-v2.jsx · the
// tape utilities + scrubber + transport). All playback/download logic is
// unchanged (expo-av via useGlobalAudioPlayer + useSpeakerDownload); only the UI
// is new. The detail screen passes Save/Share so the action row is complete.
import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Bookmark, Download, Check, Share2, Play, Pause, RotateCcw, RotateCw, Square, X } from 'lucide-react-native';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useSpeakerDownload, resolveAudioUri } from '@/hooks/useSpeakerDownload';
import { fontFamily, shadows, families, steelFill, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

// Speaker-page steel, mode-resolved. Light keeps the "one ramp step lighter"
// values (steel[400]/[600]/[100]/[200]); dark brightens inks/accents and uses
// steelFill for the solid play button (white glyph needs a mid-steel on dark).
const steelSp = (tk: Tokens) => ({
  fill: tk.isDark ? steelFill.dark : families.steel[400],
  ink: tk.isDark ? tk.colors.steelDark : families.steel[600],
  soft: tk.isDark ? tk.colors.steelSoft : families.steel[100],
  accent: tk.isDark ? tk.colors.steel : families.steel[400],
  secondary: tk.isDark ? tk.colors.steelLight : families.steel[200],
});

const SUPABASE_AUDIO_BASE = 'https://uzfqabcjxjqufpipdcla.supabase.co/storage/v1/object/public/speaker-audio';
const SPEEDS = [0.75, 1, 1.25, 1.5];

interface SpeakerPlayerProps {
  speakerId: string;
  speakerName?: string;
  title?: string;
  audioUrl?: string | null;
  youtubeId: string;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  autoplay?: boolean;
  durationSeconds?: number | null;
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function ActionBtn({ Icon, label, active, onPress }: { Icon: any; label: string; active?: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const tk = useTokens();
  const sp = steelSp(tk);
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, active ? styles.actionBtnOn : styles.actionBtnOff]}>
      <Icon size={18} color={active ? sp.ink : tk.c.textSecondary} fill={active && Icon === Bookmark ? sp.ink : 'transparent'} strokeWidth={2} />
      <Text style={[styles.actionLabel, { color: active ? sp.ink : tk.c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function SkipBtn({ dir, n, onPress }: { dir: 'back' | 'fwd'; n: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const Icon = dir === 'back' ? RotateCcw : RotateCw;
  return (
    <Pressable onPress={onPress} style={styles.skipBtn} accessibilityLabel={dir === 'back' ? `Back ${n} seconds` : `Forward ${n} seconds`}>
      <Icon size={28} color={c.text} strokeWidth={2} />
    </Pressable>
  );
}

export function SpeakerPlayer({ speakerId, speakerName, title, audioUrl, youtubeId, saved, onToggleSave, onShare, autoplay, durationSeconds }: SpeakerPlayerProps) {
  const player = useGlobalAudioPlayer();
  const barWidthRef = useRef(0);
  const remoteUri = audioUrl || `${SUPABASE_AUDIO_BASE}/${youtubeId}.m4a`;
  const download = useSpeakerDownload(speakerId, remoteUri);
  const meta = useMemo(() => ({ name: speakerName, title }), [speakerName, title]);

  const styles = useThemedStyles(makeStyles);
  const tk = useTokens();
  const sp = steelSp(tk);
  const transportBlue = families.steel[700];

  const isThisSpeaker = player.currentSpeakerId === speakerId;
  const isPlaying = isThisSpeaker && player.isPlaying;
  const isLoaded = isThisSpeaker && player.isLoaded;
  const currentTime = isThisSpeaker ? player.positionMs / 1000 : 0;
  const duration = isThisSpeaker && player.durationMs > 0 ? player.durationMs / 1000 : (durationSeconds ?? 0);
  const loadError = isThisSpeaker ? player.loadError : null;
  const remaining = Math.max(0, duration - currentTime);
  const progress = duration > 0 ? currentTime / duration : 0;

  // Autoplay only when explicitly requested. A normal detail-page visit stays
  // in the mockup's pre-play state: no STOP control and full duration at right.
  const hasPreloadedRef = useRef(false);
  useEffect(() => {
    if (autoplay && !hasPreloadedRef.current && !player.currentSpeakerId) {
      hasPreloadedRef.current = true;
      (async () => {
        const uri = await resolveAudioUri(speakerId, remoteUri);
        player.load(speakerId, uri, !!autoplay, meta);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerId, remoteUri]);

  useEffect(() => {
    if (isPlaying) activateKeepAwakeAsync('speaker-player');
    else deactivateKeepAwake('speaker-player');
    return () => { deactivateKeepAwake('speaker-player'); };
  }, [isPlaying]);

  const togglePlay = useCallback(async () => {
    if (!isLoaded) {
      const uri = await resolveAudioUri(speakerId, remoteUri);
      await player.load(speakerId, uri, true, meta);
      return;
    }
    if (isPlaying) await player.pause();
    else await player.play();
  }, [isLoaded, isPlaying, speakerId, remoteUri]);

  const onScrub = useCallback(async (e: { nativeEvent: { locationX: number } }) => {
    if (barWidthRef.current > 0 && duration > 0 && isLoaded) {
      await player.seekTo((e.nativeEvent.locationX / barWidthRef.current) * duration * 1000);
    }
  }, [duration, isLoaded]);

  const retry = useCallback(async () => {
    const uri = await resolveAudioUri(speakerId, remoteUri);
    await player.load(speakerId, uri, false, meta);
  }, [speakerId, remoteUri, meta]);

  // Scrubber + play-button gradients: light keeps the ramp pair; dark keeps the
  // scrub fill saturated (brightened steel) and the play button on steelFill.
  const scrubGrad: [string, string] = [transportBlue, transportBlue];
  const playGrad: [string, string] = [transportBlue, transportBlue];

  return (
    <View style={styles.container}>
      {/* Tape utilities */}
      <View style={styles.actionRow}>
        <ActionBtn Icon={Bookmark} label={saved ? 'Saved' : 'Save'} active={saved} onPress={onToggleSave} />
        {download.downloadStatus === 'not_downloaded' && <ActionBtn Icon={Download} label="Download" onPress={download.startDownload} />}
        {download.downloadStatus === 'downloading' && (
          <Pressable onPress={download.cancelDownload} style={[styles.actionBtn, styles.actionBtnOn]}>
            <ActivityIndicator size="small" color={sp.ink} />
            <Text style={[styles.actionLabel, { color: sp.ink }]}>{download.downloadProgress}%</Text>
            <X size={13} color={sp.ink} strokeWidth={2} />
          </Pressable>
        )}
        {download.downloadStatus === 'downloaded' && (
          <ActionBtn Icon={Check} label="Offline" active onPress={() => Alert.alert('Remove download', 'Delete the downloaded audio file?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: download.deleteDownload },
          ])} />
        )}
        <ActionBtn Icon={Share2} label="Share" onPress={onShare} />
      </View>

      {!!loadError && (
        <Pressable onPress={retry} style={styles.errorRow}>
          <Text style={styles.errorText}>{loadError} — tap to retry</Text>
        </Pressable>
      )}

      <View style={[styles.transportCard, styles.transportCardContent]}>
        {isThisSpeaker && player.isLoaded ? (
          <Pressable onPress={player.stop} style={styles.stopHeader} accessibilityLabel="Stop playback">
            <Square size={13} color={transportBlue} fill={transportBlue} />
            <Text style={styles.stopText}>STOP</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onScrub} style={styles.scrubWrap}>
          <View style={styles.track} onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}>
            <LinearGradient colors={scrubGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{fmtTime(currentTime)}</Text>
            <Text style={styles.timeMuted}>{isLoaded ? `-${fmtTime(remaining)}` : fmtTime(duration)}</Text>
          </View>
        </Pressable>
        <View style={styles.transport}>
          <SkipBtn dir="back" n="15" onPress={() => player.seekBy(-15)} />
          <Pressable onPress={togglePlay} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <LinearGradient colors={playGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
              {isPlaying ? <Pause size={28} color="#fff" fill="#fff" /> : <Play size={29} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
            </LinearGradient>
          </Pressable>
          <SkipBtn dir="fwd" n="30" onPress={() => player.seekBy(30)} />
        </View>
        <View style={styles.speedRow}>
          {SPEEDS.map((speed) => {
            const active = Math.abs((player.rate || 1) - speed) < 0.01;
            return <Pressable key={speed} onPress={() => player.setRate(speed)} style={[styles.speedChip, active && styles.speedChipActive]}><Text style={[styles.speedChipText, active && styles.speedChipTextActive]}>{speed}×</Text></Pressable>;
          })}
        </View>
      </View>
    </View>
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
  container: { marginTop: 24 },

  // action row
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999 },
  actionBtnOn: { backgroundColor: sp.soft, borderWidth: 1, borderColor: sp.accent + '55' },
  actionBtnOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: 14 },

  errorRow: { paddingVertical: 10 },
  errorText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, textAlign: 'center' },

  // scrubber
  transportCard: { marginTop: 54, marginHorizontal: -22, borderRadius: 20, backgroundColor: sp.soft, borderWidth: 1, borderColor: sp.accent + '44', overflow: 'hidden' },
  transportCardContent: { paddingHorizontal: 38, paddingTop: 20, paddingBottom: 24 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', marginBottom: 14 },
  stopText: { fontFamily: fontFamily.bold, fontSize: 12.5, letterSpacing: 1.4, color: families.steel[700] },
  scrubWrap: {},
  track: { height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontFamily: fontFamily.medium, fontSize: 14, color: c.textSecondary },
  timeMuted: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted },

  // transport
  transport: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  skipBtn: { width: 55, height: 55, borderRadius: 28, backgroundColor: c.surface, borderWidth: 1, borderColor: sp.secondary, alignItems: 'center', justifyContent: 'center', ...shadows.sm, ...darkCard },
  playBtn: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', ...shadows.lg, shadowColor: isDark ? '#000' : families.steel[400] },
  speedRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18 },
  speedChip: { minWidth: 58, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: sp.secondary, alignItems: 'center' },
  speedChipActive: { backgroundColor: families.steel[700], borderColor: families.steel[700] },
  speedChipText: { fontFamily: fontFamily.bold, fontSize: 14, color: c.textSecondary },
  speedChipTextActive: { color: '#fff' },
  });
};
