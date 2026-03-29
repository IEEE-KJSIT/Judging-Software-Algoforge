import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser } from '../types';

/**
 * Judges with role "judge" and panelActive !== false.
 * Removing a user in Authentication does not delete Firestore — use Admin "Remove from panel"
 * so orphaned docs stop counting toward the panel size.
 */
export function useJudgePanel() {
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'judge'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as AppUser))
          .filter((u) => u.panelActive !== false);
        setJudges(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { judges, judgeCount: judges.length, loading };
}
