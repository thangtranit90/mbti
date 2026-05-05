export const SESSION_KEY = 'mbti-session-token';

export const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};

export const setSessionToken = (token: string): void => {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // localStorage unavailable (private mode, disabled, quota exceeded) — proceed in-memory only
  }
};
