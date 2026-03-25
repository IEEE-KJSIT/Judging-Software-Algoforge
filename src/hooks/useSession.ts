import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Session } from '../types';

export function useSession() {
  const [session, setSession] = useState<Session>({ activeTeamId: null, activatedAt: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'session', 'current'), (snap) => {
      if (snap.exists()) {
        setSession(snap.data() as Session);
      } else {
        setSession({ activeTeamId: null, activatedAt: null });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { session, loading };
}
