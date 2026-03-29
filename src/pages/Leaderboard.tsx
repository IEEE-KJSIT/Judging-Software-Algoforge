import React, { useMemo, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useRatings } from '../hooks/useRatings';
import { useSession } from '../hooks/useSession';
import { useFullscreen } from '../hooks/useFullscreen';
import { Crown, Sparkles } from 'lucide-react';
import { CRITERIA } from '../constants/criteria';
import { useLeaderboardCelebration } from '../hooks/useLeaderboardCelebration';
import {
  calcLeaderboardScores,
  formatCriterionAvg,
  formatTotal,
  type TeamScore,
} from '../utils/leaderboardCalc';

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
    ...CRITERIA.map((c) => (s.hasScores ? s.criteriaAvg[c.id]?.toFixed(1) ?? '' : '—')),
    s.hasScores ? s.total.toFixed(1) : '—',
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
  const { session, loading: sessionLoading } = useSession();
  const tableRef = useRef<HTMLDivElement>(null);
  const { ref: fsRef, toggle: toggleFullscreen } = useFullscreen<HTMLDivElement>();

  const revealed = session.leaderboardRevealed === true;
  const canView = user?.role === 'admin' || revealed;
  const scores = useMemo(() => calcLeaderboardScores(teams, ratings), [teams, ratings]);
  useLeaderboardCelebration(scores, canView);
  const loading = teamsLoading || ratingsLoading || sessionLoading;

  return (
    <div ref={fsRef} className="min-h-screen bg-bg flex flex-col">
      <header className="flex-shrink-0 sticky top-2 z-50 mx-4 mt-4 mb-4 bg-surface/90 backdrop-blur-md border border-divider rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-card">
        <div>
          <h1 className="font-display font-700 text-text-primary text-md leading-none">
            AlgoForge <span className="text-primary">'26</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <p className="text-text-muted text-2xs font-body">
              {canView ? 'Live · confetti on new #1' : 'Results unlock at closing'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/live"
            className="min-h-[36px] px-3 py-1.5 rounded-btn border border-primary/30 text-primary text-xs font-display font-500 hover:bg-primary/10 transition-colors"
          >
            Public screen URL
          </Link>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
          >
            Fullscreen
          </button>
          {canView && scores.length > 0 && (
            <button
              type="button"
              onClick={() => exportCsv(scores)}
              className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
            >
              Export CSV
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
            >
              Admin
            </button>
          )}
          <button
            type="button"
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
        ) : !canView ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 max-w-md mx-auto">
            <Sparkles className="w-10 h-10 text-primary mb-4" aria-hidden />
            <p className="font-display font-600 text-lg text-text-primary mb-2">Leaderboard locked</p>
            <p className="text-text-secondary text-sm font-body leading-relaxed mb-6">
              Final rankings are shown at the end of the event. When the host reveals the leaderboard, open this page again or refresh to see full results.
            </p>
            <button
              type="button"
              onClick={() => navigate('/judge')}
              className="min-h-[40px] px-5 rounded-btn bg-primary/15 border border-primary/30 text-primary text-sm font-display font-500 hover:bg-primary/25 transition-colors"
            >
              Back to judging
            </button>
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-text-secondary text-md font-display font-500 mb-2">No scores yet</p>
            <p className="text-text-muted text-sm font-body">Scores will appear here as judges submit them.</p>
          </div>
        ) : (
          <>
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
                      const isLeader = rank === 1 && s.hasScores;
                      return (
                        <motion.tr
                          key={s.team.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                          className={`border-b border-divider border-l-4 ${rankStyle} last:border-b-0 ${
                            isLeader ? 'lb-row-leader' : ''
                          } ${!s.hasScores ? 'opacity-[0.7]' : ''}`}
                        >
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 font-mono text-sm font-600">
                              {isLeader && <Crown className="w-4 h-4 text-yellow-500 shrink-0" aria-hidden />}
                              {rank}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-display font-500 text-text-primary text-sm">{s.team.teamName}</span>
                              {!s.hasScores && (
                                <span className="text-2xs font-body text-text-muted italic">Awaiting first score</span>
                              )}
                              {s.tiedAbove && s.hasScores && (
                                <span className="text-2xs font-body text-warning">
                                  tied on total
                                  {s.tiebreaker ? ` · won by ${s.tiebreaker}` : ' · still equal'}
                                </span>
                              )}
                            </div>
                          </td>
                          {CRITERIA.map((c) => (
                            <td key={c.id} className="px-3 py-4 text-center">
                              <span className={`font-mono text-sm ${
                                s.tiedAbove && s.tiebreaker === c.shortName && s.hasScores
                                  ? 'text-warning font-600'
                                  : 'text-text-secondary'
                              }`}>
                                {formatCriterionAvg(s, c.id)}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`font-mono text-md font-600 ${
                                isLeader ? 'text-primary' : rank <= 3 && s.hasScores ? 'text-primary' : 'text-text-primary'
                              }`}
                            >
                              {formatTotal(s)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-sm text-text-muted">
                              {s.hasScores ? s.judgeCount : '—'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {scores.map((s, idx) => {
                const rank = idx + 1;
                const rankStyle = RANK_STYLES[rank] ?? 'border-l-divider';
                const isLeader = rank === 1 && s.hasScores;
                return (
                  <motion.div
                    key={s.team.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={`bg-surface border border-divider border-l-4 ${rankStyle.split(' ')[0] ?? 'border-l-divider'} rounded-card p-4 shadow-card ${
                      isLeader ? 'lb-row-leader' : ''
                    } ${!s.hasScores ? 'opacity-[0.7]' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 font-mono text-lg font-600 ${RANK_STYLES[rank]?.split(' ').pop() ?? 'text-text-muted'}`}>
                          {isLeader && <Crown className="w-5 h-5 text-yellow-500" aria-hidden />}
                          #{rank}
                        </span>
                        <div>
                          <span className="font-display font-500 text-text-primary text-base">{s.team.teamName}</span>
                          {!s.hasScores && (
                            <p className="text-2xs text-text-muted italic mt-0.5">Awaiting first score</p>
                          )}
                          {s.tiedAbove && s.hasScores && (
                            <p className="text-2xs font-body text-warning mt-0.5">
                              tied · won by {s.tiebreaker ?? 'still equal'}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`font-mono text-lg font-600 ${isLeader ? 'text-primary' : 'text-primary'}`}>
                        {formatTotal(s)}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {CRITERIA.map((c) => (
                        <div key={c.id} className="text-center">
                          <div className={`font-mono text-sm font-600 ${
                            s.tiedAbove && s.tiebreaker === c.shortName && s.hasScores
                              ? 'text-warning'
                              : 'text-text-secondary'
                          }`}>
                            {formatCriterionAvg(s, c.id)}
                          </div>
                          <div className="text-2xs text-text-muted font-display uppercase tracking-wider mt-0.5">{c.shortName}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-text-muted text-2xs font-body mt-6 pb-2 max-w-lg mx-auto leading-relaxed">
              {scores.length} teams · <span className="text-text-secondary">—</span> until a team is judged · confetti when #1
              changes · tiebreaker: Presentation → Innovation → Solution → Impact → Problem
            </p>
          </>
        )}
      </div>
    </div>
  );
}
