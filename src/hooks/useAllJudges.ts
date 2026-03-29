import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser } from '../types';

/** All users with role "judge" — both active on panel and removed. */
export function useAllJudges() {
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'judge'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setJudges(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { judges, loading };
}
