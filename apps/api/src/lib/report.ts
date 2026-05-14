// Story 5.2 — Compatibility report generation.
//
// v1 is intentionally light: a deterministic score based on cognitive
// function overlap + a hardcoded summary template per pairing axis. A future
// story (AI-enhanced reports) replaces this with a richer narrative.

import type { MBTIType } from '@mbti/shared';

export type CompatibilityReport = {
  inviter: { mbtiType: MBTIType; personaName: string };
  invitee: { mbtiType: MBTIType; personaName: string };
  score: number;
  sharedTraits: string[];
  divergentTraits: string[];
  summary: string;
  generatedAt: string;
};

const FUNCTIONS: Record<MBTIType, [string, string, string, string]> = {
  INTJ: ['Ni', 'Te', 'Fi', 'Se'],
  INTP: ['Ti', 'Ne', 'Si', 'Fe'],
  ENTJ: ['Te', 'Ni', 'Se', 'Fi'],
  ENTP: ['Ne', 'Ti', 'Fe', 'Si'],
  INFJ: ['Ni', 'Fe', 'Ti', 'Se'],
  INFP: ['Fi', 'Ne', 'Si', 'Te'],
  ENFJ: ['Fe', 'Ni', 'Se', 'Ti'],
  ENFP: ['Ne', 'Fi', 'Te', 'Si'],
  ISTJ: ['Si', 'Te', 'Fi', 'Ne'],
  ISFJ: ['Si', 'Fe', 'Ti', 'Ne'],
  ESTJ: ['Te', 'Si', 'Ne', 'Fi'],
  ESFJ: ['Fe', 'Si', 'Ne', 'Ti'],
  ISTP: ['Ti', 'Se', 'Ni', 'Fe'],
  ISFP: ['Fi', 'Se', 'Ni', 'Te'],
  ESTP: ['Se', 'Ti', 'Fe', 'Ni'],
  ESFP: ['Se', 'Fi', 'Te', 'Ni'],
};

export function computeCompatibilityScore(a: MBTIType, b: MBTIType): number {
  const fa = FUNCTIONS[a];
  const fb = FUNCTIONS[b];
  let shared = 0;
  for (let i = 0; i < 4; i += 1) {
    const fbi = fb[i];
    if (fbi && fa.includes(fbi)) shared += 1;
  }
  return Math.round((shared / 4) * 100) / 100;
}

export function generateCompatibilityReport(input: {
  inviter: { mbtiType: MBTIType; personaName: string };
  invitee: { mbtiType: MBTIType; personaName: string };
}): CompatibilityReport {
  const score = computeCompatibilityScore(input.inviter.mbtiType, input.invitee.mbtiType);
  const sharedTraits = FUNCTIONS[input.inviter.mbtiType].filter((f) =>
    FUNCTIONS[input.invitee.mbtiType].includes(f),
  );
  const divergentTraits = FUNCTIONS[input.inviter.mbtiType].filter(
    (f) => !FUNCTIONS[input.invitee.mbtiType].includes(f),
  );

  let tone = 'Hai bạn bổ sung cho nhau ở nhiều khía cạnh sâu sắc.';
  if (score >= 0.75) tone = 'Hai bạn cộng hưởng tự nhiên ở phần lớn nhịp suy nghĩ.';
  else if (score <= 0.25)
    tone = 'Hai bạn nhìn thế giới từ những góc khá đối lập — nhưng đó là chất liệu cho hiểu nhau sâu hơn.';

  return {
    inviter: input.inviter,
    invitee: input.invitee,
    score,
    sharedTraits,
    divergentTraits,
    summary: tone,
    generatedAt: new Date().toISOString(),
  };
}
