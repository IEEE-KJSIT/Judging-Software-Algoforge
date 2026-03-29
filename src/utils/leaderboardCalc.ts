import { CRITERIA, TIEBREAKER_ORDER } from '../constants/criteria';
import type { Team, Rating } from '../types';

export interface TeamScore {
  team: Team;
  criteriaAvg: Record<string, number>;
  total: number;
  judgeCount: number;
  tiedAbove: boolean;
  tiebreaker: string | null;
  /** At least one rating submitted for this team — hide placeholder zeros until true */
  hasScores: boolean;
}

const TIEBREAKER_NAMES: Record<string, string> = Object.fromEntries(
  CRITERIA.map((c) => [c.id, c.shortName])
);

export function calcLeaderboardScores(teams: Team[], ratings: Rating[]): TeamScore[] {
  const base = teams
    .filter((t) => t.status !== 'absent')
    .map((team) => {
      const teamRatings = ratings.filter((r) => r.teamId === team.id);
      const hasScores = teamRatings.length > 0;
      const criteriaAvg: Record<string, number> = {};
      CRITERIA.forEach((c) => {
        const cRatings = teamRatings.filter((r) => r.criterionId === c.id);
        criteriaAvg[c.id] = cRatings.length
          ? cRatings.reduce((s, r) => s + r.score, 0) / cRatings.length
          : 0;
      });
      const total = Object.values(criteriaAvg).reduce((a, b) => a + b, 0);
      const uniqueJudges = new Set(teamRatings.map((r) => r.judgeEmail)).size;
      return {
        team,
        criteriaAvg,
        total,
        judgeCount: uniqueJudges,
        tiedAbove: false,
        tiebreaker: null,
        hasScores,
      };
    })
    .sort((a, b) => {
      // Judged teams above teams with no submissions yet
      if (a.hasScores !== b.hasScores) {
        return (b.hasScores ? 1 : 0) - (a.hasScores ? 1 : 0);
      }
      if (b.total !== a.total) return b.total - a.total;
      for (const cid of TIEBREAKER_ORDER) {
        const diff = (b.criteriaAvg[cid] ?? 0) - (a.criteriaAvg[cid] ?? 0);
        if (diff !== 0) return diff;
      }
      return a.team.teamName.localeCompare(b.team.teamName, undefined, { sensitivity: 'base' });
    });

  for (let i = 1; i < base.length; i++) {
    const prev = base[i - 1];
    const curr = base[i];
    if (Math.abs(curr.total - prev.total) < 0.001 && curr.hasScores && prev.hasScores) {
      curr.tiedAbove = true;
      let breaker: string | null = null;
      for (const cid of TIEBREAKER_ORDER) {
        const diff = (prev.criteriaAvg[cid] ?? 0) - (curr.criteriaAvg[cid] ?? 0);
        if (Math.abs(diff) > 0.001) {
          breaker = TIEBREAKER_NAMES[cid] ?? null;
          break;
        }
      }
      curr.tiebreaker = breaker;
    }
  }

  return base;
}

/** Display cell: em dash until first real score exists */
export function formatCriterionAvg(s: TeamScore, criterionId: string): string {
  if (!s.hasScores) return '—';
  return s.criteriaAvg[criterionId]?.toFixed(1) ?? '—';
}

export function formatTotal(s: TeamScore): string {
  if (!s.hasScores) return '—';
  return s.total.toFixed(1);
}
