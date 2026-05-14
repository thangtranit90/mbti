import { useCallback, useEffect, useState } from 'react';
import { useSocialStatus } from './useSocialStatus';

const LAST_SEEN_KEY = 'mbti-last-seen-voter-count';
const LAST_RESULT_KEY = 'mbti-last-result-id';

function readSeen(): number {
  try {
    const v = localStorage.getItem(LAST_SEEN_KEY);
    return v ? Number.parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeSeen(n: number): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(n));
  } catch {
    /* private mode, quota — keep in-memory only */
  }
}

export function getLatestResultId(): string | null {
  try {
    return localStorage.getItem(LAST_RESULT_KEY);
  } catch {
    return null;
  }
}

export function setLatestResultId(id: string): void {
  try {
    localStorage.setItem(LAST_RESULT_KEY, id);
  } catch {
    /* ignore */
  }
}

export type SocialNotificationState = {
  show: boolean;
  voterCount: number;
  voterName: string | null;
  acknowledge: () => void;
};

export function useSocialNotification(): SocialNotificationState {
  const { data } = useSocialStatus();
  const status = data?.data ?? null;
  const [seen, setSeen] = useState<number>(() => readSeen());

  const voterCount = status?.voterCount ?? 0;
  const voterName = status?.latestVoterName ?? null;

  const acknowledge = useCallback(() => {
    writeSeen(voterCount);
    setSeen(voterCount);
  }, [voterCount]);

  // When status retreats (e.g., votes deleted), keep seen in sync to avoid
  // accidental future re-trigger. Compute the corrected seen during render so
  // we don't double-render via setState-in-effect.
  const effectiveSeen = status && voterCount < seen ? voterCount : seen;
  useEffect(() => {
    if (status && voterCount < seen) {
      writeSeen(voterCount);
    }
  }, [status, voterCount, seen]);

  const show = voterCount > 0 && voterCount > effectiveSeen;

  return { show, voterCount, voterName, acknowledge };
}
