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
}

export interface Rating {
  id: string;
  teamId: string;
  criterionId: string;
  judgeEmail: string;
  score: number;
  timestamp: unknown;
}

export interface Session {
  activeTeamId: string | null;
  activatedAt: unknown;
}

export interface Criterion {
  id: string;
  name: string;
  shortName: string;
  description: string;
  maxScore: number;
}
