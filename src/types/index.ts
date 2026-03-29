export interface Team {
  id: string;
  teamName: string;
  status: 'pending' | 'active' | 'done' | 'absent';
  order: number;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'judge';
  /** If false, not counted on the judging panel (Auth deletion does not remove Firestore — use Remove from panel). */
  panelActive?: boolean;
}

export interface Rating {
  id: string;
  teamId: string;
  criterionId: string;
  judgeEmail: string;
  score: number;
  timestamp: unknown;
  /** Optional per-team note written by this judge. Stored on all criterion docs for the same team. */
  note?: string;
}

export interface Session {
  activeTeamId: string | null;
  activatedAt: unknown;
  /** When true, /live and /leaderboard show scores. Default false for end-of-event reveal. */
  leaderboardRevealed?: boolean;
}

export interface Criterion {
  id: string;
  name: string;
  shortName: string;
  description: string;
  maxScore: number;
}
