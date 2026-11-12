import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CircleCheck } from 'lucide-react-native';

import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { SPONSORS } from '@/constants/sponsors';
import { SponsorAvatar, SponsorCardView } from '@/app/(main)/chat';
import { OnboardingSponsorChat } from '@/app/sponsor-chat';
import { SpotCheckForm } from '@/app/(main)/inventory';
import { useOnboardingChat } from '@/hooks/useOnboardingChat';
import {
  TRY_SPONSORS, TRY_EVENT_NAME, tryButtonLabel, tryClosing,
  type TryOffer, type TrySponsorId, type TryTarget,
} from '@/constants/onboardingSponsors';
import { OnboardingColumn, PrimaryButton, TourProgress, TOUR_MAX_FONT_SCALE } from '@/components/onboarding/OnboardingChrome';

// "Talk to a sponsor right now" (v4 handoffs 4 and 5) — the last tour screen. Instead of
// describing the AI sponsor, let people use it: each card opens the real chat
// (or the real Spot Check) for a short free try. The list, the chat and Spot
// Check are separate views of this one step; the flow decides which shows.

const SPOT_CHECK_DESC = 'Upset right now? Work it through on the spot.';

export function HelpList({ index, tried, offer, onOpen, onContinue, onSkip, onBack }: {
  index: number;
  tried: ReadonlySet<TryTarget>;
  offer: TryOffer;
  onOpen: (target: TryTarget) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark, colors } = useTokens();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OnboardingColumn>
        <TourProgress index={index} onSkip={onSkip} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">Talk to a sponsor right now</Text>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.subtitle}>
            Pick one and send a message. You get 3 free messages with each sponsor, plus a free spot check.
          </Text>
          <View style={styles.cards}>
            {TRY_SPONSORS.map((id) => {
              const s = SPONSORS.find((x) => x.id === id);
              if (!s) return null;
              return (
                <SponsorCardView
                  key={id}
                  name={s.name}
                  description={s.description}
                  art={<SponsorAvatar source={s.avatar} />}
                  tried={tried.has(id)}
                  showTry
                  onPress={() => onOpen(id)}
                  accessibilityLabel={`Try ${s.name}`}
                />
              );
            })}
            <SponsorCardView
              name="Spot Check"
              description={SPOT_CHECK_DESC}
              art={(
                <View style={styles.spotTile}>
                  <CircleCheck size={32} color={colors.accentDark} strokeWidth={1.8} />
                </View>
              )}
              tried={tried.has('spotcheck')}
              showTry
              onPress={() => onOpen('spotcheck')}
              accessibilityLabel="Try a spot check"
            />
          </View>
          {/* The only crisis line in this flow — each sponsor's crisis handling
              still applies to every reply. */}
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.safety}>
            An AI sponsor is no substitute for a human sponsor, a meeting, or professional help. In a crisis, call or text 988.
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label={tryButtonLabel(offer)} onPress={onContinue} />
        </View>
      </OnboardingColumn>
    </SafeAreaView>
  );
}

type TryHandlers = {
  tried: ReadonlySet<TryTarget>;
  offer: TryOffer;
  onTried: (target: TryTarget) => void;
  onFinished: (target: TryTarget) => void;
  onBack: () => void;
  onTryAnother: (from: TryTarget) => void;
  onStartTrial: (from: TryTarget) => void;
  track: (event: string, props?: Record<string, any>) => void;
};

// One sponsor's 3-message try. Keyed by sponsor in the flow, so each opening
// starts a fresh in-memory conversation.
export function HelpTryChat({ sponsorId, tried, offer, onTried, onFinished, onBack, onTryAnother, onStartTrial, track }: { sponsorId: TrySponsorId } & TryHandlers) {
  const chat = useOnboardingChat(sponsorId, {
    member: offer === 'member',
    // `tried` already holds this sponsor by now (marked on the first reply).
    closing: () => tryClosing(sponsorId, tried, offer),
    onReply: (n) => {
      track('onboarding_sponsor_message', { sponsor: TRY_EVENT_NAME[sponsorId], n });
      // Tried as soon as one message has gone through, so leaving early still
      // grays the card out.
      if (n === 1) onTried(sponsorId);
    },
    onFinished: () => onFinished(sponsorId),
  });
  const anyLeft = [...TRY_SPONSORS, 'spotcheck' as const].some((t) => t !== sponsorId && !tried.has(t));
  return (
    <OnboardingSponsorChat
      sponsorId={sponsorId}
      chat={chat}
      offer={offer}
      anyLeft={anyLeft}
      onBack={onBack}
      onTryAnother={() => onTryAnother(sponsorId)}
      onStartTrial={() => onStartTrial(sponsorId)}
    />
  );
}

// The one free Spot Check.
export function HelpTrySpotCheck({ tried, offer, onTried, onFinished, onBack, onTryAnother, onStartTrial }: TryHandlers) {
  const anyLeft = TRY_SPONSORS.some((t) => !tried.has(t));
  return (
    <SpotCheckForm
      onboarding={{
        offer,
        anyLeft,
        onBack,
        onTryAnother: () => onTryAnother('spotcheck'),
        onStartTrial: () => onStartTrial('spotcheck'),
        onFinished: () => { onTried('spotcheck'); onFinished('spotcheck'); },
      }}
    />
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
    title: { fontFamily: fontFamily.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: c.text },
    subtitle: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 20, color: c.textMuted, marginTop: 8 },
    cards: { marginTop: 18 },
    // Same footprint as the sponsor photos beside it.
    spotTile: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    safety: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 17, color: c.textMuted, textAlign: 'center', paddingHorizontal: 16, marginTop: 2 },
    footer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 },
  });
};
