const COUNTDOWN_MESSAGES = [
  "You are closer than you were yesterday. That is the whole trick.",
  "One day this calendar will be entirely your own.",
  "Future you is already awake, unhurried, and not on a call.",
  "Keep going. The finish line does not move.",
  "A free morning is quietly making its way toward you.",
  "Today's effort is buying tomorrow's unhurried coffee.",
  "Progress is boring up close and obvious from a distance.",
  "Your out-of-office message is practicing in the mirror.",
  "Another sunrise closer to choosing your own agenda.",
  "The countdown is doing its job. You only need to do today.",
  "Someday soon, Sunday night will just be Sunday night.",
  "Your future calendar contains suspicious amounts of white space.",
  "There are good days ahead with no status report attached.",
  "You are building a life with fewer alarms and better mornings.",
  "The finish line is real, even when today feels very Monday.",
  "Every ordinary day still moves the number in the right direction.",
  "Your someday plans are becoming calendar plans.",
  "The meetings are temporary. Your time will be yours.",
  "A weekday nap is waiting patiently in your future.",
  "You have survived every reply-all so far. Magnificent work.",
  "The inbox is a river. You are getting out of the river.",
  "One less commute, one more day toward freedom.",
  "Future you has declined the meeting and gone outside.",
  "The best long weekend is the one without a Monday at the end.",
  "Small steps count, especially when the destination is no alarm clock.",
  "Your retirement plans do not need a slide deck.",
  "Today's calendar belongs to work. The future one belongs to you.",
  "Soon, 'circle back' will mean taking another walk around the park.",
  "Time is passing in your favor.",
  "There is an empty desk somewhere in your future, and it looks peaceful.",
  "The road ahead includes fewer passwords and more possibilities.",
  "You are allowed to look forward to what comes next.",
  "Another day complete. Freedom remains on schedule.",
  "Your last Monday is in there somewhere.",
  "The destination is rest, choice, and mornings at your own pace.",
  "Even the longest countdown changes one day at a time.",
  "Keep a little energy for the life you are counting toward.",
];

const RETIRED_MESSAGES = [
  "Your calendar is empty and that is the point.",
  "No agenda, no action items, no follow-up required.",
  "You made it. The rest is yours.",
  "Today's only deliverable is whatever you feel like.",
  "This morning belongs entirely to you.",
  "You have officially run out of Mondays.",
  "The commute from bed to coffee is going beautifully.",
  "Your time is yours. Spend it generously on yourself.",
  "No alarm clock was consulted in the making of this day.",
  "Welcome to the part where plans can change just because you want them to.",
  "You earned the quiet, the adventure, and everything between.",
  "The out-of-office message is now a lifestyle.",
  "Today has no required attachments.",
  "Rest is productive when rest is the plan.",
  "May your days be full and your calendar be optional.",
  "The next chapter has excellent hours.",
  "You are right on time for the life after the countdown.",
  "Nothing is overdue. Enjoy that feeling.",
  "Freedom looks good on you.",
];

const FALLBACK_MESSAGE = "One day at a time. You are on your way.";

export const MESSAGE_CATALOG_SIZE = {
  countdown: COUNTDOWN_MESSAGES.length,
  retired: RETIRED_MESSAGES.length,
} as const;

const MS_PER_DAY = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayOrdinal(dateKey: string): number | null {
  const match = DATE_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const date = new Date(milliseconds);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(milliseconds / MS_PER_DAY);
}

export function messageForDay(dateKey: string, retired: boolean): string {
  const ordinal = dayOrdinal(dateKey);
  if (ordinal === null) return FALLBACK_MESSAGE;

  const pool = retired ? RETIRED_MESSAGES : COUNTDOWN_MESSAGES;
  const index = ((ordinal % pool.length) + pool.length) % pool.length;
  return pool[index] ?? FALLBACK_MESSAGE;
}
