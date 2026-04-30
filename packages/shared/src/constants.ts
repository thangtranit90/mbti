export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type MBTIType = (typeof MBTI_TYPES)[number];

// TODO Story 3.1: replace placeholder copy with curated persona names.
export const PERSONA_NAMES: Readonly<Record<MBTIType, string>> = {
  INTJ: 'The Architect',
  INTP: 'The Logician',
  ENTJ: 'The Commander',
  ENTP: 'The Debater',
  INFJ: 'The Advocate',
  INFP: 'The Mediator',
  ENFJ: 'The Protagonist',
  ENFP: 'The Campaigner',
  ISTJ: 'The Logistician',
  ISFJ: 'The Defender',
  ESTJ: 'The Executive',
  ESFJ: 'The Consul',
  ISTP: 'The Virtuoso',
  ISFP: 'The Adventurer',
  ESTP: 'The Entrepreneur',
  ESFP: 'The Entertainer',
};

export type VillainEntry = { type: MBTIType; reason: string };

const PLACEHOLDER_REASON = 'placeholder — friction reason owned by Story 3.1';

// TODO Story 3.1: replace placeholder villain reasons (and confirm the 3 friction
// types per row) with curated copy. Each value MUST contain exactly 3 entries.
export const VILLAINS_MAP: Readonly<Record<MBTIType, ReadonlyArray<VillainEntry>>> = {
  INTJ: [
    { type: 'ESFP', reason: PLACEHOLDER_REASON },
    { type: 'ENFP', reason: PLACEHOLDER_REASON },
    { type: 'ESFJ', reason: PLACEHOLDER_REASON },
  ],
  INTP: [
    { type: 'ESFJ', reason: PLACEHOLDER_REASON },
    { type: 'ESTJ', reason: PLACEHOLDER_REASON },
    { type: 'ENFJ', reason: PLACEHOLDER_REASON },
  ],
  ENTJ: [
    { type: 'ISFP', reason: PLACEHOLDER_REASON },
    { type: 'INFP', reason: PLACEHOLDER_REASON },
    { type: 'ESFP', reason: PLACEHOLDER_REASON },
  ],
  ENTP: [
    { type: 'ISFJ', reason: PLACEHOLDER_REASON },
    { type: 'ISTJ', reason: PLACEHOLDER_REASON },
    { type: 'ESFJ', reason: PLACEHOLDER_REASON },
  ],
  INFJ: [
    { type: 'ESTP', reason: PLACEHOLDER_REASON },
    { type: 'ESTJ', reason: PLACEHOLDER_REASON },
    { type: 'ENTP', reason: PLACEHOLDER_REASON },
  ],
  INFP: [
    { type: 'ESTJ', reason: PLACEHOLDER_REASON },
    { type: 'ENTJ', reason: PLACEHOLDER_REASON },
    { type: 'ESTP', reason: PLACEHOLDER_REASON },
  ],
  ENFJ: [
    { type: 'ISTP', reason: PLACEHOLDER_REASON },
    { type: 'INTP', reason: PLACEHOLDER_REASON },
    { type: 'ESTP', reason: PLACEHOLDER_REASON },
  ],
  ENFP: [
    { type: 'ISTJ', reason: PLACEHOLDER_REASON },
    { type: 'ISFJ', reason: PLACEHOLDER_REASON },
    { type: 'INTJ', reason: PLACEHOLDER_REASON },
  ],
  ISTJ: [
    { type: 'ENFP', reason: PLACEHOLDER_REASON },
    { type: 'ENTP', reason: PLACEHOLDER_REASON },
    { type: 'INFP', reason: PLACEHOLDER_REASON },
  ],
  ISFJ: [
    { type: 'ENTP', reason: PLACEHOLDER_REASON },
    { type: 'ESTP', reason: PLACEHOLDER_REASON },
    { type: 'ENTJ', reason: PLACEHOLDER_REASON },
  ],
  ESTJ: [
    { type: 'INFP', reason: PLACEHOLDER_REASON },
    { type: 'ENFP', reason: PLACEHOLDER_REASON },
    { type: 'INTP', reason: PLACEHOLDER_REASON },
  ],
  ESFJ: [
    { type: 'INTP', reason: PLACEHOLDER_REASON },
    { type: 'INTJ', reason: PLACEHOLDER_REASON },
    { type: 'ENTP', reason: PLACEHOLDER_REASON },
  ],
  ISTP: [
    { type: 'ENFJ', reason: PLACEHOLDER_REASON },
    { type: 'ESFJ', reason: PLACEHOLDER_REASON },
    { type: 'ENFP', reason: PLACEHOLDER_REASON },
  ],
  ISFP: [
    { type: 'ENTJ', reason: PLACEHOLDER_REASON },
    { type: 'ESTJ', reason: PLACEHOLDER_REASON },
    { type: 'INTJ', reason: PLACEHOLDER_REASON },
  ],
  ESTP: [
    { type: 'INFJ', reason: PLACEHOLDER_REASON },
    { type: 'INFP', reason: PLACEHOLDER_REASON },
    { type: 'INTJ', reason: PLACEHOLDER_REASON },
  ],
  ESFP: [
    { type: 'INTJ', reason: PLACEHOLDER_REASON },
    { type: 'INTP', reason: PLACEHOLDER_REASON },
    { type: 'INFJ', reason: PLACEHOLDER_REASON },
  ],
};

// Module-load runtime invariant — guards Story 3.1 copy edits from breaking
// the 3-villains-per-row contract that downstream UI assumes.
for (const t of MBTI_TYPES) {
  const row = VILLAINS_MAP[t];
  if (row.length !== 3) {
    throw new Error(`VILLAINS_MAP[${t}]: expected 3 entries, got ${row.length}`);
  }
  if (new Set(row.map((v) => v.type)).size !== 3) {
    throw new Error(`VILLAINS_MAP[${t}]: contains duplicate friction types`);
  }
  if (row.some((v) => v.type === t)) {
    throw new Error(`VILLAINS_MAP[${t}]: cannot include self as a friction type`);
  }
}
