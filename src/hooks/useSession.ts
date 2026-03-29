import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Session } from '../types';

export function useSession() {
  const [session, setSession] = useState<Session>({
    activeTeamId: null,
    activatedAt: null,
    leaderboardRevealed: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'session', 'current'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSession({
          activeTeamId: d.activeTeamId ?? null,
          activatedAt: d.activatedAt ?? null,
          leaderboardRevealed: d.leaderboardRevealed === true,
        });
      } else {
        setSession({ activeTeamId: null, activatedAt: null, leaderboardRevealed: false });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { session, loading };
}
