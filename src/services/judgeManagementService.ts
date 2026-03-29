import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Creates a Firebase Auth account for a judge WITHOUT signing the admin out.
 * Uses a temporary secondary Firebase app instance for account creation.
 */
export async function createJudgeAccount(
  name: string,
  email: string,
  password: string
): Promise<{ uid: string; email: string; name: string }> {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  const secondaryApp = initializeApp(firebaseConfig, `judge-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    await setDoc(doc(db, 'users', uid), {
      email,
      name: name.trim() || email.split('@')[0],
      role: 'judge',
      panelActive: true,
    });

    return { uid, email, name: name.trim() || email.split('@')[0] };
  } finally {
    await secondaryAuth.signOut().catch(() => null);
    await deleteApp(secondaryApp);
  }
}

/** Removes the Firestore user doc. The Auth account remains but they can't access the app. */
export async function deleteJudgeDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}
