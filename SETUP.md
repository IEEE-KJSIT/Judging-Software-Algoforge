# Hack-Judge V2 — Setup Guide

## Step 1 — Create a New Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it (e.g. `algoforge-26`) → Continue
3. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Enable Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, enable **Email/Password**
4. Click **Save**

Now create accounts for yourself and all judges:
- Go to the **Users** tab → **Add user**
- Enter email + password for each judge and yourself
- **Write down each person's email** — they'll use it to log in

**Important — two different “users” places:**

| Where | What it is | When it appears |
|-------|------------|-----------------|
| **Authentication → Users** | Login accounts (email/password) | You create these here manually |
| **Firestore → `users` collection** | App profile: `name`, `role` | **Only after** someone logs in through your app once |

You do **not** create the Firestore `users` collection yourself. Open the app, sign in once — the app creates `users/{yourUid}` automatically. Then you can change `role` to `admin` in Firestore.

---

## Step 3 — Enable Firestore

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → pick a region → **Enable**

Once created, go to the **Rules** tab and paste in the contents of `firestore.rules` from this project.

---

## Step 4 — Get Your Firebase Config

1. Go to **Project Settings** (gear icon top-left)
2. Scroll to **"Your apps"** → click the **Web** icon (`</>`)
3. Register the app (any nickname) → **Register app**
4. Copy the `firebaseConfig` values

---

## Step 5 — Set Up Your .env File

1. In this project folder, copy `.env.example` → rename it to `.env`
2. Paste your Firebase config values into the `.env` file:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 6 — Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**If you see `auth/invalid-api-key`:**

1. **Restart the dev server** — Vite reads `.env` only when it starts. Stop the terminal (`Ctrl+C`), then run `npm run dev` again.
2. **Put `.env` in the project root** — same folder as `package.json` (`Judging Software\.env`), not inside `src\`.
3. **Variable names must start with `VITE_`** — e.g. `VITE_FIREBASE_API_KEY=...` (no spaces around `=`).
4. **Re-copy the API key** from Firebase: **Project settings → Your apps → SDK setup and configuration** (the `apiKey` value).
5. **Do not use smart quotes** — use plain straight quotes or no quotes around values.

---

## Step 7 — Set Yourself as Admin

When you first log in, your account is created as a **judge** by default.
To make yourself admin:

1. Go to **Firebase Console → Firestore Database**
2. Find the `users` collection → find your document (it's your UID)
3. Edit the `role` field → change from `"judge"` to `"admin"`
4. Refresh the app — you'll now be redirected to the Admin panel

---

## Step 8 — Seed Your Teams

1. Log in as admin → you'll see the **First-Time Setup** screen
2. Paste your 24 team names (one per line)
3. Click **Seed Teams**

Done! The app is ready.

---

## Day-of-Event Flow

### Admin (you):
1. Open `/admin` on your laptop
2. Open `/leaderboard` on a second screen/projector tab
3. As each team presents, click **Set Active** → judges see the team instantly
4. After judges finish, click **Mark Done** → move to next team
5. Watch the leaderboard update live

### Judges:
1. Open the app on their phone and log in
2. They'll see **"Waiting for next team"**
3. When you set a team active, their screen updates automatically
4. They use the sliders to score (1–10), tap **Review & Submit**, confirm
5. After submitting, they wait for the next team

### Leaderboard:
- Updates in real-time as scores come in
- Click **Export CSV** for final results

---

## Update Number of Judges

Open `src/constants/criteria.ts` and change:
```ts
export const TOTAL_JUDGES = 5; // ← change to your actual count
```

This only affects the progress indicator on the admin panel.

---

## Deploy on Vercel

### 1. Push your code to GitHub (or GitLab / Bitbucket)

Vercel deploys from a Git repo. Commit the project (do **not** commit `.env`; it is in `.gitignore`).

### 2. Import the project in Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New** → **Project**
2. **Import** your repository
3. Vercel should auto-detect **Vite**:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** — add the same names as in your local `.env` (all must use the `VITE_` prefix):

   | Name | Value |
   |------|--------|
   | `VITE_FIREBASE_API_KEY` | from Firebase config |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from Firebase config |
   | `VITE_FIREBASE_PROJECT_ID` | from Firebase config |
   | `VITE_FIREBASE_STORAGE_BUCKET` | from Firebase config |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from Firebase config |
   | `VITE_FIREBASE_APP_ID` | from Firebase config |

5. Click **Deploy**

After deploy, Vercel gives you a URL like `https://your-app.vercel.app`.

### 3. Allow your Vercel URL in Firebase (required for login)

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add `your-app.vercel.app` (no `https://`)
4. If you use a custom domain on Vercel, add that domain too

Without this step, sign-in on the deployed site can fail.

### 4. `vercel.json` in this repo

The repo includes `vercel.json` with a **rewrite** so React Router routes (`/admin`, `/judge`, `/leaderboard`) work when you refresh or open a direct link.

### Deploy from the terminal (optional)

```bash
npx vercel
```

Link the project, add env vars when prompted (or set them in the Vercel dashboard), then deploy. Use `npx vercel --prod` for production.
