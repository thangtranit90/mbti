// Story 4.3 — Behavioral tag derivation for the gap visualization.
//
// Tags are derived deterministically so the client never sees raw answers.
// Mappings:
//   - p1-decision (or T_F dimension)  4-5 → "Quyết đoán"  else "Cân nhắc"
//   - p2-social   (or E_I dimension)  4-5 → "Hướng ngoại" else "Hướng nội"
//   - p3-conflict (or J_P dimension)  4-5 → "Thẳng thắn"  else "Né tránh"

export type Answer = { questionId: string; value: number };

const DECISION_HIGH = 'Quyết đoán';
const DECISION_LOW = 'Cân nhắc';
const SOCIAL_HIGH = 'Hướng ngoại';
const SOCIAL_LOW = 'Hướng nội';
const CONFLICT_HIGH = 'Thẳng thắn';
const CONFLICT_LOW = 'Né tránh';

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

export function deriveFriendTags(answers: Answer[]): string[] {
  const decision = answers.filter((a) => a.questionId.startsWith('p1')).map((a) => a.value);
  const social = answers.filter((a) => a.questionId.startsWith('p2')).map((a) => a.value);
  const conflict = answers.filter((a) => a.questionId.startsWith('p3')).map((a) => a.value);
  return [
    avg(decision) >= 3.5 ? DECISION_HIGH : DECISION_LOW,
    avg(social) >= 3.5 ? SOCIAL_HIGH : SOCIAL_LOW,
    avg(conflict) >= 3.5 ? CONFLICT_HIGH : CONFLICT_LOW,
  ];
}

// Self tags derive from the standard 12-question test answers. Question IDs
// in the seed include their dimension prefix (e.g. 'q-ei-1', 'q-tf-1').
export function deriveSelfTags(answers: Answer[]): string[] {
  const ei = answers.filter((a) => /(^|-)ei(-|$)/i.test(a.questionId)).map((a) => a.value);
  const tf = answers.filter((a) => /(^|-)tf(-|$)/i.test(a.questionId)).map((a) => a.value);
  const jp = answers.filter((a) => /(^|-)jp(-|$)/i.test(a.questionId)).map((a) => a.value);
  return [
    avg(jp) >= 3 ? DECISION_HIGH : DECISION_LOW,
    avg(ei) >= 3 ? SOCIAL_HIGH : SOCIAL_LOW,
    avg(tf) >= 3 ? CONFLICT_HIGH : CONFLICT_LOW,
  ];
}

export function aggregateFriendAnswers(votes: Array<{ behavioral_answers: string }>): Answer[] {
  const flat: Answer[] = [];
  for (const v of votes) {
    try {
      const parsed = JSON.parse(v.behavioral_answers) as Answer[];
      flat.push(...parsed);
    } catch {
      // Skip malformed row — analytics, but never crash status.
      continue;
    }
  }
  return flat;
}
