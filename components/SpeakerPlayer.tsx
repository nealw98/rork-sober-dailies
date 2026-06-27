// Speaker player — reskinned to the prototype (frames/hifi-speaker-v2.jsx · the
// tape utilities + scrubber + transport). All playback/download logic is
// unchanged (expo-av via useGlobalAudioPlayer + useSpeakerDownload); only the UI
// is new. The detail screen passes Save/Share so the action row is complete.
import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Bookmark, Download, Check, Share2, Play, Pause, RotateCcw, RotateCw, X } from 'lucide-react-native';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useSpeakerDownload, resolveAudioUri } from '@/hooks/useSpeakerDownload';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const MT = colors.tertiary;
const MT_DARK = colors.tertiaryDark ?? '#7A5FB5';
const MT_SOFT = colors.tertiarySoft ?? '#E9E0F6';
const SECONDARY = colors.secondary ?? '#5C8DFF';

const SUPABASE_AUDIO_BASE = 'https://uzfqabcjxjqufpipdcla.supabase.co/storage/v1/object/public/speaker-audio';
const SPEEDS = [1, 1.25, 1.5, 2];

interface SpeakerPlayerProps {
  speakerId: string;
  audioUrl?: string | null;
  youtubeId: string;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  autoplay?: boolean;
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ActionBtn({ Icon, label, active, onPress }: { Icon: any; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, active ? styles.actionBtnOn : styles.actionBtnOff]}>
      <Icon size={14} color={active ? MT_DARK : c.textSecondary} fill={active && Icon === Bookmark ? MT_DARK : 'transparent'} strokeWidth={2} />
      <Text style={[styles.actionLabel, { color: active ? MT_DARK : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function SkipBtn({ dir, n, onPress }: { dir: 'back' | 'fwd'; n: string; onPress: () => void }) {
  const Icon = dir === 'back' ? RotateCcw : RotateCw;
  return (
    <Pressable onPress={onPress} style={styles.skipBtn} accessibilityLabel={dir === 'back' ? `Back ${n} seconds` : `Forward ${n} seconds`}>
      <Icon size={18} color={c.text} strokeWidth={2} />
      <Text style={styles.skipNum}>{n}</Text>
    </Pressable>
  );
}

export function SpeakerPlayer({ speakerId, audioUrl, youtubeId, saved, onToggleSave, onShare, autoplay }: SpeakerPlayerProps) {
  const player = useGlobalAudioPlayer();
  const barWidthRef = useRef(0);
  const remoteUri = audioUrl || `${SUPABASE_AUDIO_BASE}/${youtubeId}.m4a`;
  const download = useSpeakerDownload(speakerId, remoteUri);

  const isThisSpeaker = player.currentSpeakerId === speakerId;
  const isPlaying = isThisSpeaker && player.isPlaying;
  const isLoaded = isThisSpeaker && player.isLoaded;
  const currentTime = isThisSpeaker ? player.positionMs / 1000 : 0;
  const duration = isThisSpeaker ? player.durationMs / 1000 : 0;
  const loadError = isThisSpeaker ? player.loadError : null;
  const remaining = Math.max(0, duration - currentTime);
  const progress = duration > 0 ? currentTime / duration : 0;

  // Preload (or autoplay) on mount if nothing else is playing.
  const hasPreloadedRef = useRef(false);
  useEffect(() => {
    if (!hasPreloadedRef.current && !player.currentSpeakerId) {
      hasPreloadedRef.current = true;
      (async () => {
        const uri = await resolveAudioUri(speakerId, remoteUri);
        player.load(speakerId, uri, !!autoplay);
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
      await player.load(speakerId, uri, true);
      return;
    }
    if (isPlaying) await player.pause();
    else await player.play();
  }, [isLoaded, isPlaying, speakerId, remoteUri]);

  const cycleSpeed = useCallback(async () => {
    const i = SPEEDS.indexOf(player.rate);
    await player.setRate(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  }, [player.rate]);

  const onScrub = useCallback(async (e: { nativeEvent: { locationX: number } }) => {
    if (barWidthRef.current > 0 && duration > 0 && isLoaded) {
      await player.seekTo((e.nativeEvent.locationX / barWidthRef.current) * duration * 1000);
    }
  }, [duration, isLoaded]);

  const retry = useCallback(async () => {
    const uri = await resolveAudioUri(speakerId, remoteUri);
    await player.load(speakerId, uri);
  }, [speakerId, remoteUri]);

  const fmtSpeed = (s: number) => `${s.toString().replace(/\.0+$/, '')}× speed`;

  return (
    <View style={styles.container}>
      {/* Tape utilities */}
      <View style={styles.actionRow}>
        <ActionBtn Icon={Bookmark} label={saved ? 'Saved' : 'Save'} active={saved} onPress={onToggleSave} />
        {download.downloadStatus === 'not_downloaded' && <ActionBtn Icon={Download} label="Download" onPress={download.startDownload} />}
        {download.downloadStatus === 'downloading' && (
          <Pressable onPress={download.cancelDownload} style={[styles.actionBtn, styles.actionBtnOn]}>
            <ActivityIndicator size="small" color={MT_DARK} />
            <Text style={[styles.actionLabel, { color: MT_DARK }]}>{download.downloadProgress}%</Text>
            <X size={13} color={MT_DARK} strokeWidth={2} />
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

      {/* Scrubber */}
      <Pressable onPress={onScrub} style={styles.scrubWrap}>
        <View style={styles.track} onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}>
          <LinearGradient colors={[MT, SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(currentTime)}</Text>
          <Text style={styles.timeMuted}>{duration > 0 ? `-${fmtTime(remaining)}` : fmtTime(0)}</Text>
        </View>
      </Pressable>

      {/* Transport */}
      <View style={styles.transport}>
        <SkipBtn dir="back" n="15" onPress={() => player.seekBy(-15)} />
        <View style={styles.playWrap}>
          <Pressable onPress={togglePlay} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <LinearGradient colors={[MT, MT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
              {isPlaying ? <Pause size={24} color="#fff" fill="#fff" /> : <Play size={25} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
            </LinearGradient>
          </Pressable>
          <Pressable onPress={cycleSpeed} style={styles.speedPill}>
            <Text style={styles.speedText}>{fmtSpeed(player.rate || 1)}</Text>
          </Pressable>
        </View>
        <SkipBtn dir="fwd" n="30" onPress={() => player.seekBy(30)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },

  // action row
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  actionBtnOn: { backgroundColor: MT_SOFT, borderWidth: 1, borderColor: MT + '55' },
  actionBtnOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: 11.5 },

  errorRow: { paddingVertical: 10 },
  errorText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, textAlign: 'center' },

  // scrubber
  scrubWrap: { marginTop: 18 },
  track: { height: 5, borderRadius: 999, backgroundColor: c.divider, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontFamily: fontFamily.medium, fontSize: 11.5, color: c.textSecondary },
  timeMuted: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted },

  // transport
  transport: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  skipBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  skipNum: { fontFamily: fontFamily.bold, fontSize: 8.5, color: c.textMuted, marginTop: 1 },
  playWrap: { alignItems: 'center' },
  playBtn: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', ...shadows.lg, shadowColor: MT },
  speedPill: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  speedText: { fontFamily: fontFamily.bold, fontSize: 12, color: c.textSecondary, letterSpacing: 0.3 },
});
