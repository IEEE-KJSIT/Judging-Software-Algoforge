import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../hooks/useSession';
import { useTeams } from '../hooks/useTeams';
import { submitRatings, hasJudgeSubmittedForTeam } from '../services/ratingService';
import { CRITERIA } from '../constants/criteria';
import type { Team } from '../types';

type Screen = 'waiting' | 'scoring' | 'confirm' | 'submitted' | 'checking';

const DEFAULT_SCORES = Object.fromEntries(CRITERIA.map((c) => [c.id, 5]));

export function Judge() {
  const { user } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { teams } = useTeams();

  const [screen, setScreen] = useState<Screen>('waiting');
  const [scores, setScores] = useState<Record<string, number>>(DEFAULT_SCORES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastSubmittedTeam, setLastSubmittedTeam] = useState<Team | null>(null);
  const [lastTotal, setLastTotal] = useState(0);

  const activeTeam = teams.find((t) => t.id === session?.activeTeamId) ?? null;

  // When session changes, check status for the new active team
  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.activeTeamId || !user) {
      setScreen('waiting');
      return;
    }

    setScreen('checking');
    hasJudgeSubmittedForTeam(session.activeTeamId, user.email).then((already) => {
      if (already) {
        setScreen('submitted');
      } else {
        setScores(DEFAULT_SCORES);
        setSubmitError('');
        setScreen('scoring');
      }
    });
  }, [session?.activeTeamId, sessionLoading, user]);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSlider = useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }, []);

  async function handleConfirm() {
    if (!activeTeam || !user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitRatings(activeTeam.id, user.email, scores);
      setLastSubmittedTeam(activeTeam);
      setLastTotal(totalScore);
      setScreen('submitted');
    } catch {
      setSubmitError('Failed to submit. Please try again.');
      setScreen('scoring');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || screen === 'checking') {
    return (
      <PageShell user={user?.email ?? ''}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell user={user?.email ?? ''}>
      {screen === 'waiting' && <WaitingScreen />}
      {screen === 'scoring' && activeTeam && (
        <ScoringScreen
          team={activeTeam}
          scores={scores}
          totalScore={totalScore}
          onSlider={handleSlider}
          onSubmit={() => setScreen('confirm')}
        />
      )}
      {screen === 'confirm' && activeTeam && (
        <ConfirmScreen
          team={activeTeam}
          scores={scores}
          totalScore={totalScore}
          submitting={submitting}
          error={submitError}
          onConfirm={handleConfirm}
          onBack={() => setScreen('scoring')}
        />
      )}
      {screen === 'submitted' && (
        <SubmittedScreen team={lastSubmittedTeam ?? activeTeam} total={lastTotal} />
      )}
    </PageShell>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

function PageShell({ user, children }: { user: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-divider">
        <div>
          <span className="font-display font-700 text-text-primary text-base">
            AlgoForge <span className="text-primary">'26</span>
          </span>
          <p className="text-text-muted text-2xs font-body mt-0.5 truncate max-w-[180px]">{user}</p>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="min-h-[36px] px-3 py-1.5 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-display font-500 hover:bg-danger/20 transition-colors"
        >
          Sign Out
        </button>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto">{children}</div>
    </div>
  );
}

// ─── Waiting ─────────────────────────────────────────────────────────────────

function WaitingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-surface border border-divider flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-text-muted animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
      </div>
      <h2 className="font-display font-700 text-xl text-text-primary mb-2">Waiting for next team</h2>
      <p className="text-text-secondary text-sm font-body max-w-xs">
        The admin will activate the next team. This screen will update automatically.
      </p>
    </div>
  );
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function ScoringScreen({
  team,
  scores,
  totalScore,
  onSlider,
  onSubmit,
}: {
  team: Team;
  scores: Record<string, number>;
  totalScore: number;
  onSlider: (id: string, val: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Team header */}
      <div className="px-4 pt-5 pb-4 border-b border-divider bg-surface/40">
        <p className="text-2xs font-display font-500 text-primary uppercase tracking-widest mb-1">
          ● Now Judging
        </p>
        <h2 className="font-display font-700 text-xl text-text-primary">{team.teamName}</h2>
        <p className="text-text-muted font-mono text-xs mt-1">#{String(team.order).padStart(2, '0')}</p>
      </div>

      {/* Criteria sliders */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {CRITERIA.map((criterion) => {
          const val = scores[criterion.id] ?? 5;
          const pct = ((val - 1) / 9) * 100;
          return (
            <div key={criterion.id}>
              <div className="flex items-baseline justify-between mb-3">
                <label className="text-2xs font-display font-500 text-text-secondary uppercase tracking-widest">
                  {criterion.name}
                </label>
                <span className="font-mono text-2xl font-600 text-text-primary">{val}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={val}
                onChange={(e) => onSlider(criterion.id, Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #6C63FF ${pct}%, #2A2A38 ${pct}%)`,
                }}
              />
              <p className="text-text-muted text-2xs font-body mt-2">{criterion.description}</p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 pt-4 pb-safe border-t border-divider bg-surface/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-sm font-body">Total Score</span>
          <span className="font-mono text-lg font-600 text-primary">
            {totalScore}<span className="text-text-muted text-sm">/50</span>
          </span>
        </div>
        <button
          onClick={onSubmit}
          className="w-full min-h-[52px] bg-primary text-white rounded-btn text-md font-display font-700 hover:brightness-110 hover:shadow-glow transition-all"
        >
          Review & Submit
        </button>
      </div>
    </div>
  );
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

function ConfirmScreen({
  team,
  scores,
  totalScore,
  submitting,
  error,
  onConfirm,
  onBack,
}: {
  team: Team;
  scores: Record<string, number>;
  totalScore: number;
  submitting: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 py-6">
      <div className="flex-1">
        <h2 className="font-display font-700 text-xl text-text-primary mb-1">Confirm Scores</h2>
        <p className="text-text-secondary text-sm font-body mb-6">
          Submitting for <span className="text-text-primary font-500">{team.teamName}</span>. Once submitted, you cannot change these scores.
        </p>

        <div className="bg-surface border border-divider rounded-card overflow-hidden mb-4">
          {CRITERIA.map((criterion, idx) => (
            <div
              key={criterion.id}
              className={`flex items-center justify-between px-4 py-3.5 ${idx < CRITERIA.length - 1 ? 'border-b border-divider' : ''}`}
            >
              <span className="text-text-secondary text-sm font-body">{criterion.name}</span>
              <span className="font-mono text-md font-600 text-text-primary">{scores[criterion.id] ?? 5}/10</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-4 bg-primary/5 border-t border-primary/20">
            <span className="font-display font-700 text-text-primary text-sm">Total</span>
            <span className="font-mono text-xl font-600 text-primary">{totalScore}/50</span>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-input bg-danger/10 border border-danger/30 text-danger text-sm font-body mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 pb-safe space-y-3">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full min-h-[52px] bg-primary text-white rounded-btn text-md font-display font-700 hover:brightness-110 hover:shadow-glow transition-all disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            'Confirm & Submit'
          )}
        </button>
        <button
          onClick={onBack}
          disabled={submitting}
          className="w-full min-h-[44px] border border-divider text-text-secondary rounded-btn text-sm font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors disabled:opacity-60"
        >
          Go Back & Edit
        </button>
      </div>
    </div>
  );
}

// ─── Submitted ────────────────────────────────────────────────────────────────

function SubmittedScreen({ team, total }: { team: Team | null; total: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14L11 19L22 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="font-display font-700 text-xl text-text-primary mb-2">Scores Submitted</h2>
      {team && (
        <p className="text-text-secondary text-sm font-body mb-1">
          {team.teamName}
        </p>
      )}
      {total > 0 && (
        <p className="font-mono text-lg font-600 text-primary mb-6">
          {total}/50
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-text-muted text-sm font-body">
        <div className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
        Waiting for next team...
      </div>
    </div>
  );
}
