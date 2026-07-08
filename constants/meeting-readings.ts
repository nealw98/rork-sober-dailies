/**
 * Common A.A. Meeting Readings — the public-domain passages read aloud at the
 * start of most meetings. Single source of truth for the Literature home
 * preview, the full Meeting Readings list, and the single-reading reader.
 *
 * All text is 1st-edition Alcoholics Anonymous (public domain) or A.A.
 * fellowship text. `cite` is the short label on cards; `source` is the
 * attribution shown in the reader; `tone` colors the card spine.
 */
import { colors } from '@/constants/designTokens';

export type MeetingReading = {
  id: string;
  title: string;
  cite: string;
  source: string;
  tone: string;
  content: string;
};

const AMBER = colors.amber;       // #E8A95D — Big Book passages
const LAV = colors.tertiary;      // #A386D5 — Traditions
const GREEN = '#5E8C6A';          // Preamble

export const MEETING_READINGS: MeetingReading[] = [
  {
    id: 'how-it-works',
    title: 'How It Works',
    cite: 'Big Book · Ch. 5',
    source: 'Alcoholics Anonymous · Chapter 5, pp. 58–60',
    tone: AMBER,
    content: `Rarely have we seen a person fail who has thoroughly followed our path. Those who do not recover are people who cannot or will not completely give themselves to this simple program, usually men and women who are constitutionally incapable of being honest with themselves. There are such unfortunates. They are not at fault; they seem to have been born that way. They are naturally incapable of grasping and developing a manner of living which demands rigorous honesty. Their chances are less than average. There are those, too, who suffer from grave emotional and mental disorders, but many of them do recover if they have the capacity to be honest.

Our stories disclose in a general way what we used to be like, what happened, and what we are like now. If you have decided you want what we have and are willing to go to any length to get it—then you are ready to take certain steps.

At some of these we balked. We thought we could find an easier, softer way. But we could not. With all the earnestness at our command, we beg of you to be fearless and thorough from the very start. Some of us have tried to hold on to our old ideas and the result was nil until we let go absolutely.

Remember that we deal with alcohol—cunning, baffling, powerful! Without help it is too much for us. But there is One who has all power—that One is God. May you find Him now!

Half measures availed us nothing. We stood at the turning point. We asked His protection and care with complete abandon.

Here are the steps we took, which are suggested as a program of recovery:

1. We admitted we were powerless over alcohol—that our lives had become unmanageable.
2. Came to believe that a Power greater than ourselves could restore us to sanity.
3. Made a decision to turn our will and our lives over to the care of God as we understood Him.
4. Made a searching and fearless moral inventory of ourselves.
5. Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.
6. Were entirely ready to have God remove all these defects of character.
7. Humbly asked Him to remove our shortcomings.
8. Made a list of all persons we had harmed, and became willing to make amends to them all.
9. Made direct amends to such people wherever possible, except when to do so would injure them or others.
10. Continued to take personal inventory and when we were wrong promptly admitted it.
11. Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.
12. Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.

Many of us exclaimed, "What an order! I can't go through with it." Do not be discouraged. No one among us has been able to maintain anything like perfect adherence to these principles. We are not saints. The point is, that we are willing to grow along spiritual lines. The principles we have set down are guides to progress. We claim spiritual progress rather than spiritual perfection.`,
  },
  {
    id: 'there-is-a-solution',
    title: 'There Is a Solution',
    cite: 'Big Book · p. 25',
    source: 'Alcoholics Anonymous (1st Edition) · p. 25',
    tone: AMBER,
    content: `There is a solution. Almost none of us liked the self-searching, the leveling of our pride, the confession of short-comings which the process requires for its successful consummation. But we saw that it really worked in others, and we had come to believe in the hopelessness and futility of life as we had been living it. When, therefore, we were approached by those in whom the problem had been solved, there was nothing left for us but to pick up the simple kit of spiritual tools laid at our feet. We have found much of heaven and we have been rocketed into a fourth dimension of existence of which we had not even dreamed.

The great fact is just this, and nothing less: That we have had deep and effective spiritual experiences which have revolutionized our whole attitude toward life, toward our fellows and toward God's universe. The central fact of our lives today is the absolute certainty that our Creator has entered into our hearts and lives in a way which is indeed miraculous. He has commenced to accomplish those things for us which we could never do by ourselves.`,
  },
  {
    id: 'promises',
    title: 'The Ninth Step Promises',
    cite: 'Big Book · pp. 83–84',
    source: 'Alcoholics Anonymous · pp. 83–84',
    tone: AMBER,
    content: `If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness. We will not regret the past nor wish to shut the door on it. We will comprehend the word serenity and we will know peace. No matter how far down the scale we have gone, we will see how our experience can benefit others. That feeling of uselessness and self-pity will disappear. We will lose interest in selfish things and gain interest in our fellows. Self-seeking will slip away. Our whole attitude and outlook upon life will change. Fear of people and of economic insecurity will leave us. We will intuitively know how to handle situations which used to baffle us. We will suddenly realize that God is doing for us what we could not do for ourselves.

Are these extravagant promises? We think not. They are being fulfilled among us—sometimes quickly, sometimes slowly. They will always materialize if we work for them.`,
  },
  {
    id: 'vision',
    title: 'A Vision for You',
    cite: 'Big Book · Ch. 11',
    source: 'Alcoholics Anonymous · Chapter 11, p. 164',
    tone: AMBER,
    content: `Our book is meant to be suggestive only. We realize we know only a little. God will constantly disclose more to you and to us. Ask Him in your morning meditation what you can do each day for the man who is still sick. The answers will come, if your own house is in order. But obviously you cannot transmit something you haven't got. See to it that your relationship with Him is right, and great events will come to pass for you and countless others. This is the Great Fact for us.

Abandon yourself to God as you understand God. Admit your faults to Him and to your fellows. Clear away the wreckage of your past. Give freely of what you find and join us. We shall be with you in the Fellowship of the Spirit, and you will surely meet some of us as you trudge the Road of Happy Destiny.

May God bless you and keep you—until then.`,
  },
  {
    id: 'traditions',
    title: 'The Twelve Traditions',
    cite: 'Short form',
    source: 'The Twelve Traditions of Alcoholics Anonymous',
    tone: LAV,
    content: `1. Our common welfare should come first; personal recovery depends upon A.A. unity.
2. For our group purpose there is but one ultimate authority—a loving God as He may express Himself in our group conscience. Our leaders are but trusted servants; they do not govern.
3. The only requirement for A.A. membership is a desire to stop drinking.
4. Each group should be autonomous except in matters affecting other groups or A.A. as a whole.
5. Each group has but one primary purpose—to carry its message to the alcoholic who still suffers.
6. An A.A. group ought never endorse, finance or lend the A.A. name to any related facility or outside enterprise, lest problems of money, property and prestige divert us from our primary purpose.
7. Every A.A. group ought to be fully self-supporting, declining outside contributions.
8. Alcoholics Anonymous should remain forever nonprofessional, but our service centers may employ special workers.
9. A.A., as such, ought never be organized; but we may create service boards or committees directly responsible to those they serve.
10. Alcoholics Anonymous has no opinion on outside issues; hence the A.A. name ought never be drawn into public controversy.
11. Our public relations policy is based upon attraction rather than promotion; we need always maintain personal anonymity at the level of press, radio and films.
12. Anonymity is the spiritual foundation of all our Traditions, ever reminding us to place principles before personalities.`,
  },
  {
    id: 'preamble',
    title: 'The A.A. Preamble',
    cite: 'Read at most meetings',
    source: 'The A.A. Preamble',
    tone: GREEN,
    content: `Alcoholics Anonymous is a fellowship of men and women who share their experience, strength and hope with each other that they may solve their common problem and help others to recover from alcoholism.

The only requirement for membership is a desire to stop drinking. There are no dues or fees for AA membership; we are self-supporting through our own contributions. AA is not allied with any sect, denomination, politics, organization or institution; does not wish to engage in any controversy, neither endorses nor opposes any causes. Our primary purpose is to stay sober and help other alcoholics to achieve sobriety.`,
  },
  {
    id: 'generic-format',
    title: 'Meeting Script',
    cite: 'Adapt to your group',
    source: 'A format you can adapt for any meeting',
    // True amber/gold — the Steel Navy theme remaps colors.amber → teal, so a
    // literal gold here keeps this utility guide distinct from the teal readings.
    tone: '#E8A95D',
    content: `Use this as a basic outline to be adapted to your local tradition.

Opening
Welcome to the __________ Meeting of Alcoholics Anonymous. My name is __________ and I am an alcoholic. Let's begin with a moment of silence followed by the Serenity Prayer.

Preamble
(Read the A.A. Preamble.)

Readings
I've asked a friend to read "How It Works" (Chapter 5). I've asked a friend to read the Twelve Traditions.

Introductions & Newcomers
Is anyone in their first 30 days of sobriety who would like to introduce themselves?

Announcements
Are there any AA-related announcements? Any anniversaries being celebrated this week?

Meeting Format
This is a __________ meeting (open/closed, discussion, speaker, step study). Please keep shares to about 3–5 minutes so everyone has time.

Seventh Tradition
We will now practice the 7th Tradition: AA is self-supporting through our own contributions, declining outside contributions.

Closing
That's all the time we have. Thank you to everyone who shared. After a moment of silence, please join me in the closing prayer.

Anonymity Statement
"Who you see here, what you hear here, when you leave here, let it stay here."`,
  },
];

// The three shown as a preview on the Literature home.
export const PREVIEW_READING_IDS = ['generic-format', 'how-it-works', 'traditions'];

export function getMeetingReading(id: string): MeetingReading | undefined {
  return MEETING_READINGS.find((r) => r.id === id);
}
