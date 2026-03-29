import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser } from '../types';

export async function getOrCreateUser(uid: string, email: string): Promise<AppUser> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid, ...snap.data() } as AppUser;
  }

  const newUser: Omit<AppUser, 'uid'> = {
    email,
    name: email.split('@')[0],
    role: 'judge',
    panelActive: true,
  };

  await setDoc(ref, newUser);
  return { uid, ...newUser };
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
}

export async function updateUserRole(uid: string, role: AppUser['role']) {
  await updateDoc(doc(db, 'users', uid), { role });
}

/** Stops counting this account toward the panel (does not delete Auth). */
export async function setJudgePanelActive(uid: string, panelActive: boolean) {
  await updateDoc(doc(db, 'users', uid), { panelActive });
}
