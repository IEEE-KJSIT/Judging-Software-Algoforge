import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

function ratingDocId(teamId: string, criterionId: string, judgeEmail: string): string {
  const safeEmail = judgeEmail.replace(/[.@]/g, '_');
  return `${teamId}_${criterionId}_${safeEmail}`;
}

export async function submitRatings(
  teamId: string,
  judgeEmail: string,
  scores: Record<string, number>
): Promise<void> {
  const ops = Object.entries(scores).map(([criterionId, score]) => {
    const ref = doc(db, 'ratings', ratingDocId(teamId, criterionId, judgeEmail));
    return setDoc(ref, {
      teamId,
      criterionId,
      judgeEmail,
      score,
      timestamp: serverTimestamp(),
    });
  });

  await Promise.all(ops);
}

export async function hasJudgeSubmittedForTeam(
  teamId: string,
  judgeEmail: string
): Promise<boolean> {
  const q = query(
    collection(db, 'ratings'),
    where('teamId', '==', teamId),
    where('judgeEmail', '==', judgeEmail)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
