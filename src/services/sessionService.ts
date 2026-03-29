import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** When false, /live and judges see a waiting screen; flip at closing. */
export async function setLeaderboardRevealed(revealed: boolean) {
  await setDoc(
    doc(db, 'session', 'current'),
    { leaderboardRevealed: revealed },
    { merge: true }
  );
}
