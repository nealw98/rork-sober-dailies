import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import SimpleTextReader from "./SimpleTextReader";

interface MeetingReading {
  id: string;
  title: string;
  content: string;
  source?: string;
}

const meetingReadings: MeetingReading[] = [
  {
    id: "generic-format",
    title: "Generic Meeting Format",
    source: "Meeting format guide (not from official AA literature)",
    content: "Use this as a basic outline to be adapted to your local tradition.\n\nOpening\nWelcome to the __________ Meeting of Alcoholics Anonymous.\nMy name is __________ and I am an alcoholic.\nLet's begin with a moment of silence followed by the Serenity Prayer.\n(Lead prayer: \"God, grant me the serenity…\")\n\nPreamble\nAlcoholics Anonymous is a fellowship of men and women who share their experience, strength and hope with each other that they may solve their common problem and help others to recover from alcoholism.\nThe only requirement for membership is a desire to stop drinking. There are no dues or fees for AA membership; we are self‑supporting through our own contributions.\nAA is not allied with any sect, denomination, politics, organization or institution; does not wish to engage in any controversy; neither endorses nor opposes any causes. Our primary purpose is to stay sober and help other alcoholics to achieve sobriety.\n\nReadings\n* I've asked a friend to read \"How It Works\" (Chapter 5).\n* I've asked a friend to read the Twelve Traditions.\n\nIntroductions & Newcomers\nIs anyone in their first 30 days of sobriety who would like to introduce themselves?\n\nAnnouncements\n* Are there any AA-related announcements?\n* Are there any anniversaries being celebrated this week?\n\nMeeting Format\n* This is a __________ meeting (open/closed, discussion, speaker, step study, etc.)\n* Please keep shares to about 3–5 minutes so everyone has time.\n* We ask that you keep your shares related to your experience with alcoholism and recovery.\n\nDiscussion / Speaker\n(Chair introduces speaker or discussion leader or opens floor for sharing)\n\nSeventh Tradition\nWe will now practice the 7th Tradition which states that AA is self-supporting through our own contributions, declining outside contributions. We will now pass the basket.\n(If virtual: contributions can be made via __________).\n\nClosing\nThat's all the time we have. Thank you to everyone who shared.\nAfter a moment of silence, please join me in the closing prayer (Serenity Prayer or Lord's Prayer).\n\nAnonymity Statement\n\"Who you see here, what you hear here, when you leave here, let it stay here.\""
  },
  {
    id: "preamble",
    title: "AA Preamble",
    content: "Alcoholics Anonymous is a fellowship of men and women who share their experience, strength and hope with each other that they may solve their common problem and help others to recover from alcoholism.\n\nThe only requirement for membership is a desire to stop drinking. There are no dues or fees for AA membership; we are self-supporting through our own contributions. AA is not allied with any sect, denomination, politics, organization or institution; does not wish to engage in any controversy, neither endorses nor opposes any causes. Our primary purpose is to stay sober and help other alcoholics to achieve sobriety."
  },
  {
    id: "how-it-works",
    title: "How It Works",
    source: "Alcoholics Anonymous, Chapter 5, pages 58-60",
    content: "Rarely have we seen a person fail who has thoroughly followed our path. Those who do not recover are people who cannot or will not completely give themselves to this simple program, usually men and women who are constitutionally incapable of being honest with themselves. There are such unfortunates. They are not at fault; they seem to have been born that way. They are naturally incapable of grasping and developing a manner of living which demands rigorous honesty. Their chances are less than average. There are those, too, who suffer from grave emotional and mental disorders, but many of them do recover if they have the capacity to be honest.\n\nOur stories disclose in a general way what we used to be like, what happened, and what we are like now. If you have decided you want what we have and are willing to go to any length to get it—then you are ready to take certain steps.\n\nAt some of these we balked. We thought we could find an easier, softer way. But we could not. With all the earnestness at our command, we beg of you to be fearless and thorough from the very start. Some of us have tried to hold on to our old ideas and the result was nil until we let go absolutely.\n\nRemember that we deal with alcohol—cunning, baffling, powerful! Without help it is too much for us. But there is One who has all power—that One is God. May you find Him now!\n\nHalf measures availed us nothing. We stood at the turning point. We asked His protection and care with complete abandon.\n\nHere are the steps we took, which are suggested as a program of recovery:\n\n1. We admitted we were powerless over alcohol—that our lives had become unmanageable.\n\n2. Came to believe that a Power greater than ourselves could restore us to sanity.\n\n3. Made a decision to turn our will and our lives over to the care of God as we understood Him.\n\n4. Made a searching and fearless moral inventory of ourselves.\n\n5. Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.\n\n6. Were entirely ready to have God remove all these defects of character.\n\n7. Humbly asked Him to remove our shortcomings.\n\n8. Made a list of all persons we had harmed, and became willing to make amends to them all.\n\n9. Made direct amends to such people wherever possible, except when to do so would injure them or others.\n\n10. Continued to take personal inventory and when we were wrong promptly admitted it.\n\n11. Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.\n\n12. Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.\n\nMany of us exclaimed, \"What an order! I can't go through with it.\" Do not be discouraged. No one among us has been able to maintain anything like perfect adherence to these principles. We are not saints. The point is, that we are willing to grow along spiritual lines. The principles we have set down are guides to progress. We claim spiritual progress rather than spiritual perfection.\n\nOur description of the alcoholic, the chapter to the agnostic, and our personal adventures before and after make clear three pertinent ideas:\n\n(a) That we were alcoholic and could not manage our own lives.\n(b) That probably no human power could have relieved our alcoholism.\n(c) That God could and would if He were sought."
  },
  {
    id: "traditions",
    title: "The Twelve Traditions",
    source: "Twelve Steps and Twelve Traditions and Alcoholics Anonymous",
    content: "1. Our common welfare should come first; personal recovery depends upon A.A. unity.\n\n2. For our group purpose there is but one ultimate authority—a loving God as He may express Himself in our group conscience. Our leaders are but trusted servants; they do not govern.\n\n3. The only requirement for A.A. membership is a desire to stop drinking.\n\n4. Each group should be autonomous except in matters affecting other groups or A.A. as a whole.\n\n5. Each group has but one primary purpose—to carry its message to the alcoholic who still suffers.\n\n6. An A.A. group ought never endorse, finance or lend the A.A. name to any related facility or outside enterprise, lest problems of money, property and prestige divert us from our primary purpose.\n\n7. Every A.A. group ought to be fully self-supporting, declining outside contributions.\n\n8. Alcoholics Anonymous should remain forever nonprofessional, but our service centers may employ special workers.\n\n9. A.A., as such, ought never be organized; but we may create service boards or committees directly responsible to those they serve.\n\n10. Alcoholics Anonymous has no opinion on outside issues; hence the A.A. name ought never be drawn into public controversy.\n\n11. Our public relations policy is based upon attraction rather than promotion; we need always maintain personal anonymity at the level of press, radio and films.\n\n12. Anonymity is the spiritual foundation of all our Traditions, ever reminding us to place principles before personalities."
  },
  {
    id: "promises",
    title: "The 9th Step Promises",
    source: "Alcoholics Anonymous, pages 83-84",
    content: "If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness. We will not regret the past nor wish to shut the door on it. We will comprehend the word serenity and we will know peace. No matter how far down the scale we have gone, we will see how our experience can benefit others. That feeling of uselessness and self-pity will disappear. We will lose interest in selfish things and gain interest in our fellows. Self-seeking will slip away. Our whole attitude and outlook upon life will change. Fear of people and of economic insecurity will leave us. We will intuitively know how to handle situations which used to baffle us. We will suddenly realize that God is doing for us what we could not do for ourselves.\n\nAre these extravagant promises? We think not. They are being fulfilled among us—sometimes quickly, sometimes slowly. They will always materialize if we work for them."
  },
  {
    id: "there-is-a-solution",
    title: "There Is a Solution",
    source: "Alcoholics Anonymous (1st Edition), p. 25",
    content: "*There is a solution.* Almost none of us liked the self-searching, the leveling of our pride, the confession of short-comings which the process requires for its successful consummation. But we saw that it really worked in others, and we had come to believe in the hopelessness and futility of life as we had been living it. When, therefore, we were approached by those in whom the problem had been solved, there was nothing left for us but to pick up the simple kit of spiritual tools laid at our feet. We have found much of heaven and we have been rocketed into a fourth dimension of existence of which we had not even dreamed.\n\nThe great fact is just this, and nothing less: That we have had deep and effective spiritual experiences* which have revolutionized our whole attitude toward life, toward our fellows and toward God's universe. The central fact of our lives today is the absolute certainty that our Creator has entered into our hearts and lives in a way which is indeed miraculous. He has commenced to accomplish those things for us which we could never do by ourselves.\n\n*Fully explained—Appendix II"
  },
  {
    id: "vision",
    title: "A Vision for You",
    source: "Alcoholics Anonymous, Chapter 11, page 164",
    content: "Our book is meant to be suggestive only. We realize we know only a little. God will constantly disclose more to you and to us. Ask Him in your morning meditation what you can do each day for the man who is still sick. The answers will come, if your own house is in order. But obviously you cannot transmit something you haven't got. See to it that your relationship with Him is right, and great events will come to pass for you and countless others. This is the Great Fact for us.\n\nAbandon yourself to God as you understand God. Admit your faults to Him and to your fellows. Clear away the wreckage of your past. Give freely of what you find and join us. We shall be with you in the Fellowship of the Spirit, and you will surely meet some of us as you trudge the Road of Happy Destiny.\n\nMay God bless you and keep you—until then."
  }
];

function MeetingPocketBrowserContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [textReaderVisible, setTextReaderVisible] = useState(false);
  const [currentReading, setCurrentReading] = useState<MeetingReading | null>(null);

  const handleOpenContent = useCallback((reading: MeetingReading) => {
    setCurrentReading(reading);
    setTextReaderVisible(true);
  }, []);

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
        <Text style={styles.headerTitle}>AA Meeting Readings</Text>
      </LinearGradient>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.listContainer}>
          {meetingReadings.map((reading, index) => (
            <TouchableOpacity
              key={reading.id}
              style={[
                styles.listRow,
                index === meetingReadings.length - 1 && styles.listRowLast
              ]}
              onPress={() => handleOpenContent(reading)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowTitle}>{reading.title}</Text>
              <ChevronRight size={18} color="#a0a0a0" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={textReaderVisible}
        onRequestClose={() => setTextReaderVisible(false)}
        animationType="slide"
        transparent={false}
      >
        {currentReading && (
          <SimpleTextReader
            content={currentReading.content}
            title={currentReading.title}
            source={currentReading.source}
            indentParagraphs={currentReading.id !== 'generic-format'}
            onClose={() => setTextReaderVisible(false)}
          />
        )}
      </Modal>
    </View>
  );
}

export default function MeetingPocketBrowser() {
  return <MeetingPocketBrowserContent />;
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
  listContainer: {
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
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
});
