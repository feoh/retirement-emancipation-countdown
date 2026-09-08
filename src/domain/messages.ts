const COUNTDOWN_MESSAGES = [
  "Somewhere, a spreadsheet is being updated without you. Enjoy that.",
  "Every meeting you sit through is one you never have to sit through again.",
  "The inbox is a river. You are getting out of the river.",
  "You are closer than you were yesterday. That is the whole trick.",
  "One day this calendar will be entirely your own.",
  "Future you is already awake, unhurried, and not on a call.",
  "Somebody will inherit your unread channels. It will not be you.",
  "Progress is boring up close and obvious from a distance.",
  "The status update you skip in retirement is the sweetest one.",
  "Keep going. The finish line does not move.",
];

const RETIRED_MESSAGES = [
  "Your calendar is empty and that is the point.",
  "No agenda, no action items, no follow-up required.",
  "You made it. The rest is yours.",
  "Somewhere a recurring invite has finally stopped recurring.",
  "Today's only deliverable is whatever you feel like.",
];

function hashDate(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function messageForDay(dateKey: string, retired: boolean): string {
  const pool = retired ? RETIRED_MESSAGES : COUNTDOWN_MESSAGES;
  return pool[hashDate(dateKey) % pool.length];
}
