import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getSessionToken, setSessionToken } from '@/lib/session';
import { apiCall } from '@/lib/api';
import { SessionInitResponseSchema } from '@mbti/shared';

interface SessionContextValue {
  token: string | null;
}

const SessionContext = createContext<SessionContextValue>({ token: null });

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const ranRef = useRef(false);

  const { mutate: initSession } = useMutation({
    mutationFn: async () => {
      const raw = await apiCall<unknown>('/api/sessions/init', { method: 'POST' });
      return SessionInitResponseSchema.parse(raw);
    },
    onSuccess: (res) => {
      if (res.error) {
        console.error('session init returned error envelope:', res.error);
        return;
      }
      setSessionToken(res.data.sessionToken);
      setToken(res.data.sessionToken);
    },
    onError: (err) => {
      console.error('session init request failed:', err);
    },
  });

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (!getSessionToken()) {
      initSession();
    }
  }, [initSession]);

  return <SessionContext.Provider value={{ token }}>{children}</SessionContext.Provider>;
}
