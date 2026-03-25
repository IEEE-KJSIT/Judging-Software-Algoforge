import React, { useMemo, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useRatings } from '../hooks/useRatings';
import { CRITERIA } from '../constants/criteria';
import type { Team, Rating } from '../types';

interface TeamScore {
  team: Team;
  criteriaAvg: Record<string, number>;
  total: number;
  judgeCount: number;
}

function calcScores(teams: Team[], ratings: Rating[]): TeamScore[] {
  return teams
    .filter((t) => t.status !== 'absent')
    .map((team) => {
      const teamRatings = ratings.filter((r) => r.teamId === team.id);

      const criteriaAvg: Record<string, number> = {};
      CRITERIA.forEach((c) => {
        const cRatings = teamRatings.filter((r) => r.criterionId === c.id);
        criteriaAvg[c.id] = cRatings.length
          ? cRatings.reduce((s, r) => s + r.score, 0) / cRatings.length
          : 0;
      });

      const total = Object.values(criteriaAvg).reduce((a, b) => a + b, 0);

      const uniqueJudges = new Set(teamRatings.map((r) => r.judgeEmail)).size;

      return { team, criteriaAvg, total, judgeCount: uniqueJudges };
    })
    .sort((a, b) => b.total - a.total);
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-primary/10 border-l-primary text-yellow-400',
  2: 'bg-white/[0.04] border-l-[#A0A0B8] text-[#A0A0B8]',
  3: 'bg-white/[0.025] border-l-[#8B6914] text-[#CD9B3E]',
};

function exportCsv(scores: TeamScore[]) {
  const headers = ['Rank', 'Team', ...CRITERIA.map((c) => c.shortName), 'Total'];
  const rows = scores.map((s, i) => [
    i + 1,
    `"${s.team.teamName}"`,
    ...CRITERIA.map((c) => s.criteriaAvg[c.id]?.toFixed(1) ?? '0.0'),
    s.total.toFixed(1),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'algoforge26-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { ratings, loading: ratingsLoading } = useRatings();
  const tableRef = useRef<HTMLDivElement>(null);

  const scores = useMemo(() => calcScores(teams, ratings), [teams, ratings]);

  const loading = teamsLoading || ratingsLoading;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 sticky top-2 z-50 mx-4 mt-4 mb-4 bg-surface/90 backdrop-blur-md border border-divider rounded-card px-4 py-3 flex items-center justify-between shadow-card">
        <div>
          <h1 className="font-display font-700 text-text-primary text-md leading-none">
            AlgoForge <span className="text-primary">'26</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <p className="text-text-muted text-2xs font-body">Live Leaderboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scores.length > 0 && (
            <button
              onClick={() => exportCsv(scores)}
              className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
            >
              Export CSV
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => signOut(auth)}
            className="min-h-[36px] px-3 py-1.5 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-display font-500 hover:bg-danger/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 pb-safe max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-text-secondary text-md font-display font-500 mb-2">No scores yet</p>
            <p className="text-text-muted text-sm font-body">Scores will appear here as judges submit them.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div ref={tableRef} className="hidden md:block overflow-hidden rounded-card border border-divider shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-divider">
                    <th className="px-4 py-3 text-left text-2xs font-display font-500 text-text-muted uppercase tracking-widest w-12">#</th>
                    <th className="px-4 py-3 text-left text-2xs font-display font-500 text-text-muted uppercase tracking-widest">Team</th>
                    {CRITERIA.map((c) => (
                      <th key={c.id} className="px-3 py-3 text-center text-2xs font-display font-500 text-text-muted uppercase tracking-widest whitespace-nowrap">
                        {c.shortName}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-2xs font-display font-500 text-text-muted uppercase tracking-widest">Total</th>
                    <th className="px-4 py-3 text-center text-2xs font-display font-500 text-text-muted uppercase tracking-widest">Judges</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {scores.map((s, idx) => {
                      const rank = idx + 1;
                      const rankStyle = RANK_STYLES[rank] ?? 'bg-transparent border-l-divider text-text-muted';
                      return (
                        <motion.tr
                          key={s.team.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                          className={`border-b border-divider border-l-4 ${rankStyle} last:border-b-0`}
                        >
                          <td className="px-4 py-4">
                            <span className="font-mono text-sm font-600">{rank}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-display font-500 text-text-primary text-sm">{s.team.teamName}</span>
                          </td>
                          {CRITERIA.map((c) => (
                            <td key={c.id} className="px-3 py-4 text-center">
                              <span className="font-mono text-sm text-text-secondary">
                                {s.criteriaAvg[c.id]?.toFixed(1) ?? '—'}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-4 text-center">
                            <span className={`font-mono text-md font-600 ${rank <= 3 ? 'text-primary' : 'text-text-primary'}`}>
                              {s.total.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-sm text-text-muted">{s.judgeCount}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {scores.map((s, idx) => {
                const rank = idx + 1;
                const rankStyle = RANK_STYLES[rank] ?? 'border-l-divider';
                return (
                  <motion.div
                    key={s.team.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={`bg-surface border border-divider border-l-4 ${rankStyle.split(' ')[0] ?? 'border-l-divider'} rounded-card p-4 shadow-card`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-lg font-600 ${RANK_STYLES[rank]?.split(' ').pop() ?? 'text-text-muted'}`}>
                          #{rank}
                        </span>
                        <span className="font-display font-500 text-text-primary text-base">{s.team.teamName}</span>
                      </div>
                      <span className="font-mono text-lg font-600 text-primary">{s.total.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {CRITERIA.map((c) => (
                        <div key={c.id} className="text-center">
                          <div className="font-mono text-sm text-text-secondary font-600">{s.criteriaAvg[c.id]?.toFixed(1) ?? '—'}</div>
                          <div className="text-2xs text-text-muted font-display uppercase tracking-wider mt-0.5">{c.shortName}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-text-muted text-2xs font-body mt-6 pb-2">
              {scores.length} teams · scores update in real-time
            </p>
          </>
        )}
      </div>
    </div>
  );
}
