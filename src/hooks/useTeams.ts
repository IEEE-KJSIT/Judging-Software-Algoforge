import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Team } from '../types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('order'));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { teams, loading };
}
