import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Rating } from '../types';

export function useRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ratings'), (snap) => {
      setRatings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rating)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { ratings, loading };
}
