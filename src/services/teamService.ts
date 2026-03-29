import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Team } from '../types';

export async function seedTeams(teamNames: string[]) {
  const existing = await getDocs(collection(db, 'teams'));
  const deleteOps = existing.docs.map((d) => deleteDoc(doc(db, 'teams', d.id)));
  await Promise.all(deleteOps);

  const addOps = teamNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => {
      const ref = doc(collection(db, 'teams'));
      return setDoc(ref, {
        teamName: name,
        status: 'pending',
        order: index + 1,
      });
    });

  await Promise.all(addOps);
}

export async function setTeamStatus(teamId: string, status: Team['status']) {
  await updateDoc(doc(db, 'teams', teamId), { status });
}

export async function setActiveTeam(teamId: string, previousActiveId: string | null) {
  const ops: Promise<unknown>[] = [];

  if (previousActiveId && previousActiveId !== teamId) {
    ops.push(updateDoc(doc(db, 'teams', previousActiveId), { status: 'done' }));
  }

  ops.push(
    setDoc(
      doc(db, 'session', 'current'),
      {
        activeTeamId: teamId,
        activatedAt: new Date(),
      },
      { merge: true }
    )
  );

  ops.push(updateDoc(doc(db, 'teams', teamId), { status: 'active' }));

  await Promise.all(ops);
}

export async function deactivateTeam(teamId: string, newStatus: Team['status']) {
  await Promise.all([
    setDoc(
      doc(db, 'session', 'current'),
      {
        activeTeamId: null,
        activatedAt: null,
      },
      { merge: true }
    ),
    updateDoc(doc(db, 'teams', teamId), { status: newStatus }),
  ]);
}
