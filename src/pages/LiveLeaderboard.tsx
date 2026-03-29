import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { useTeams } from '../hooks/useTeams';
import { useRatings } from '../hooks/useRatings';
import { useSession } from '../hooks/useSession';
import { useFullscreen } from '../hooks/useFullscreen';
import { useLeaderboardCelebration } from '../hooks/useLeaderboardCelebration';
import { CRITERIA } from '../constants/criteria';
import {
  calcLeaderboardScores,
  formatCriterionAvg,
  formatTotal,
} from '../utils/leaderboardCalc';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-primary/10 border-l-primary text-yellow-400',
  2: 'bg-white/[0.04] border-l-[#A0A0B8] text-[#A0A0B8]',
  3: 'bg-white/[0.025] border-l-[#8B6914] text-[#CD9B3E]',
};

/**
 * Public URL for teams & audience — no login.
 * Requires Firestore rules: read allowed on teams, ratings, session.
 * Table is shown only when `session.leaderboardRevealed` is true (admin Event tab).
 */
export function LiveLeaderboard() {
  const { teams, loading: teamsLoading } = useTeams();
  const { ratings, loading: ratingsLoading } = useRatings();
  const { session, loading: sessionLoading } = useSession();
  const { ref, toggle } = useFullscreen<HTMLDivElement>();

  const revealed = session.leaderboardRevealed === true;
  const scores = useMemo(() => calcLeaderboardScores(teams, ratings), [teams, ratings]);
  useLeaderboardCelebration(scores, revealed);
  const loading = teamsLoading || ratingsLoading || sessionLoading;

  return (
    <div ref={ref} className="min-h-screen bg-bg flex flex-col text-text-primary">
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-divider bg-surface/80 backdrop-blur-sm">
        <div>
          <h1 className="font-display font-700 text-xl md:text-2xl leading-none flex items-center gap-2 flex-wrap">
            <Sparkles className="w-6 h-6 text-primary shrink-0" aria-hidden />
            <span>
              AlgoForge <span className="text-primary">'26</span>
            </span>
            <span className="text-text-secondary font-500 text-base md:text-lg">Live</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${revealed ? 'bg-success animate-pulse' : 'bg-text-muted'}`}
            />
            <span className="text-text-muted text-sm font-body">
              {revealed
                ? 'Live results · confetti when #1 changes'
                : 'Final rankings shown at closing — stay tuned'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="min-h-[44px] px-4 rounded-btn border border-divider text-text-secondary text-sm font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
          >
            Fullscreen
          </button>
          <Link
            to="/"
            className="min-h-[44px] px-4 rounded-btn bg-primary/15 border border-primary/30 text-primary text-sm font-display font-500 hover:bg-primary/25 transition-colors inline-flex items-center"
          >
            Judge login
          </Link>
        </div>
      </header>

      <div className="flex-1 px-3 md:px-6 py-4 max-w-[1400px] mx-auto w-full overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-12 h-12 border-2 border-divider border-t-primary rounded-full animate-spin" />
          </div>
        ) : !revealed ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary" aria-hidden />
            </div>
            <h2 className="font-display font-700 text-2xl md:text-3xl text-text-primary mb-3">
              Results at the end
            </h2>
            <p className="text-text-secondary text-base md:text-lg font-body leading-relaxed">
              Rankings stay hidden until closing. Grab a seat — we&apos;ll reveal the leaderboard when judging finishes.
            </p>
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
            <p className="font-display text-lg text-text-secondary mb-2">Leaderboard starts soon</p>
            <p className="text-text-muted text-sm font-body">Scores appear here in real time.</p>
          </div>
        ) : (
          <>
            <div className="rounded-card border border-divider shadow-card overflow-hidden">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-divider bg-surface-raised/50">
                    <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-display font-500 text-text-muted uppercase tracking-widest w-14">
                      #
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-display font-500 text-text-muted uppercase tracking-widest">
                      Team
                    </th>
                    {CRITERIA.map((c) => (
                      <th
                        key={c.id}
                        className="px-2 md:px-3 py-3 text-center text-xs md:text-sm font-display font-500 text-text-muted uppercase tracking-widest whitespace-nowrap"
                      >
                        {c.shortName}
                      </th>
                    ))}
                    <th className="px-3 md:px-4 py-3 text-center text-xs md:text-sm font-display font-500 text-text-muted uppercase tracking-widest">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, idx) => {
                    const rank = idx + 1;
                    const rankStyle = RANK_STYLES[rank] ?? 'bg-transparent border-l-divider text-text-muted';
                    const isLeader = rank === 1 && s.hasScores;
                    return (
                      <motion.tr
                        key={s.team.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.5), duration: 0.25 }}
                        className={`border-b border-divider border-l-[3px] md:border-l-4 ${rankStyle} last:border-b-0 ${
                          isLeader ? 'lb-row-leader' : ''
                        } ${!s.hasScores ? 'opacity-[0.7]' : ''}`}
                      >
                        <td className="px-3 md:px-4 py-3 md:py-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-lg md:text-2xl font-600">
                            {isLeader && <Crown className="w-6 h-6 md:w-7 md:h-7 text-yellow-500 shrink-0" aria-hidden />}
                            {rank}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 md:py-4">
                          <span className="font-display font-500 text-base md:text-xl text-text-primary block">
                            {s.team.teamName}
                          </span>
                          {!s.hasScores && (
                            <span className="text-2xs md:text-xs text-text-muted italic">Awaiting first score</span>
                          )}
                          {s.tiedAbove && s.hasScores && (
                            <span className="block text-2xs text-warning font-body mt-1">
                              Tie on total — rank by {s.tiebreaker ?? 'criteria'}
                            </span>
                          )}
                        </td>
                        {CRITERIA.map((c) => (
                          <td key={c.id} className="px-2 md:px-3 py-3 md:py-4 text-center">
                            <span
                              className={`font-mono text-sm md:text-lg ${
                                s.tiedAbove && s.tiebreaker === c.shortName && s.hasScores
                                  ? 'text-warning font-600'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {formatCriterionAvg(s, c.id)}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                          <span
                            className={`font-mono text-lg md:text-2xl font-600 ${
                              isLeader ? 'text-primary' : 'text-text-primary'
                            }`}
                          >
                            {formatTotal(s)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-center text-text-muted text-xs md:text-sm font-body mt-6 pb-4 max-w-2xl mx-auto leading-relaxed">
              {scores.length} teams · <span className="text-text-secondary">—</span> = not judged yet · tiebreaker:
              Presentation → Innovation → Solution → Impact → Problem
            </p>
          </>
        )}
      </div>
    </div>
  );
}
