import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/** Vite only exposes vars prefixed with VITE_. Trim quotes/spaces from copy-paste. */
function viteEnv(name: string): string {
  const raw = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  if (raw === undefined || String(raw).trim() === '') {
    throw new Error(
      `Missing ${name}. Create a .env file in the project root (next to package.json), add ${name}=..., then stop and restart "npm run dev".`
    );
  }
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

const firebaseConfig = {
  apiKey: viteEnv('VITE_FIREBASE_API_KEY'),
  authDomain: viteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: viteEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: viteEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: viteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: viteEnv('VITE_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);
