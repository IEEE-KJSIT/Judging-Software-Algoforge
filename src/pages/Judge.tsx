import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../hooks/useSession';
import { useTeams } from '../hooks/useTeams';
import { useRatings } from '../hooks/useRatings';
import { submitRatings, hasJudgeSubmittedForTeam } from '../services/ratingService';
import { CRITERIA } from '../constants/criteria';
import type { Team } from '../types';

type Screen = 'waiting' | 'scoring' | 'confirm' | 'submitted' | 'checking';
type Tab = 'judge' | 'scores';

const DEFAULT_SCORES = Object.fromEntries(CRITERIA.map((c) => [c.id, 5]));

export function Judge() {
  const { user } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { teams } = useTeams();
  const { ratings } = useRatings();

  const [tab, setTab] = useState<Tab>('judge');
  const [screen, setScreen] = useState<Screen>('waiting');
  const [scores, setScores] = useState<Record<string, number>>(DEFAULT_SCORES);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastSubmittedTeam, setLastSubmittedTeam] = useState<Team | null>(null);
  const [lastTotal, setLastTotal] = useState(0);
  /** Set when editing a previous team from My Scores; null = normal active-team flow */
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  /** True when the current edit was started from My Scores tab (so we return there after submit) */
  const [editFromScores, setEditFromScores] = useState(false);

  const activeTeam = teams.find((t) => t.id === session?.activeTeamId) ?? null;
  const removedFromPanel = user?.role === 'judge' && user.panelActive === false;

  // My ratings - all ratings submitted by this judge
  const myRatings = useMemo(
    () => ratings.filter((r) => r.judgeEmail === user?.email),
    [ratings, user?.email]
  );

  // Teams this judge has already scored, in presentation order
  const scoredTeams = useMemo(() => {
    const scoredIds = new Set(myRatings.map((r) => r.teamId));
    return teams
      .filter((t) => scoredIds.has(t.id))
      .sort((a, b) => a.order - b.order);
  }, [teams, myRatings]);

  // The team currently being displayed on the scoring/confirm screen
  const targetTeam = editingTeamId
    ? (teams.find((t) => t.id === editingTeamId) ?? null)
    : activeTeam;

  // When session changes, reset to normal flow (unless mid-edit of a different team)
  useEffect(() => {
    if (sessionLoading) return;
    if (editingTeamId) return; // Don't interrupt an in-progress edit

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
        setNote('');
        setSubmitError('');
        setScreen('scoring');
      }
    });
  }, [session?.activeTeamId, sessionLoading, user, editingTeamId]);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSlider = useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }, []);

  /** Start editing a previously submitted team */
  function handleEditTeam(teamId: string, fromScoresTab = false) {
    const teamRatings = myRatings.filter((r) => r.teamId === teamId);
    const existing = Object.fromEntries(teamRatings.map((r) => [r.criterionId, r.score]));
    const existingNote = teamRatings[0]?.note ?? '';
    setScores({ ...DEFAULT_SCORES, ...existing });
    setNote(existingNote);
    setEditingTeamId(teamId);
    setEditFromScores(fromScoresTab);
    setSubmitError('');
    setTab('judge');
    setScreen('scoring');
  }

  /** Cancel an edit — go back to wherever it came from */
  function handleCancelEdit() {
    setEditingTeamId(null);
    setEditFromScores(false);
    if (editFromScores) {
      setTab('scores');
    } else {
      setScreen('submitted');
    }
  }

  async function handleConfirm() {
    const targetId = editingTeamId ?? activeTeam?.id;
    if (!targetId || !user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitRatings(targetId, user.email, scores, note);
      const wasEditFromScores = editFromScores;
      setEditingTeamId(null);
      setEditFromScores(false);
      if (wasEditFromScores) {
        setTab('scores');
        // Return judge tab to the appropriate state for the active team
        if (!activeTeam) {
          setScreen('waiting');
        } else {
          const alreadySubmitted = await hasJudgeSubmittedForTeam(activeTeam.id, user.email);
          setScreen(alreadySubmitted ? 'submitted' : 'scoring');
        }
      } else {
        // Normal first submit or edit-from-submitted
        const team = targetId === activeTeam?.id ? activeTeam : null;
        setLastSubmittedTeam(team);
        setLastTotal(totalScore);
        setScreen('submitted');
      }
    } catch {
      setSubmitError('Failed to submit. Please try again.');
      setScreen('scoring');
    } finally {
      setSubmitting(false);
    }
  }

  if (removedFromPanel) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-divider">
          <span className="font-display font-700 text-text-primary text-base">AlgoForge &apos;26</span>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="min-h-[36px] px-3 py-1.5 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-display font-500"
          >
            Sign out
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-text-primary font-display font-500 text-md mb-2">Not on judging panel</p>
          <p className="text-text-secondary text-sm font-body max-w-sm">
            Your account was removed from the panel. If this is a mistake, contact the organiser.
          </p>
        </div>
      </div>
    );
  }

  if (sessionLoading || screen === 'checking') {
    return (
      <PageShell user={user?.email ?? ''} tab={tab} onTabChange={setTab} scoredCount={scoredTeams.length}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell user={user?.email ?? ''} tab={tab} onTabChange={setTab} scoredCount={scoredTeams.length}>

      {/* ── Judge Tab ── */}
      {tab === 'judge' && (
        <>
          {screen === 'waiting' && <WaitingScreen />}
          {screen === 'scoring' && targetTeam && (
            <ScoringScreen
              team={targetTeam}
              isEditing={!!editingTeamId}
              scores={scores}
              totalScore={totalScore}
              note={note}
              onSlider={handleSlider}
              onNoteChange={setNote}
              onSubmit={() => setScreen('confirm')}
              onCancelEdit={editingTeamId ? handleCancelEdit : undefined}
            />
          )}
          {screen === 'confirm' && targetTeam && (
            <ConfirmScreen
              team={targetTeam}
              isEditing={!!editingTeamId}
              scores={scores}
              totalScore={totalScore}
              note={note}
              submitting={submitting}
              error={submitError}
              onConfirm={handleConfirm}
              onBack={() => setScreen('scoring')}
            />
          )}
          {screen === 'submitted' && (
            <SubmittedScreen
              team={lastSubmittedTeam ?? activeTeam}
              total={lastTotal}
              onEdit={() => {
                const id = lastSubmittedTeam?.id ?? activeTeam?.id;
                if (id) handleEditTeam(id, false);
              }}
            />
          )}
        </>
      )}

      {/* ── My Scores Tab ── */}
      {tab === 'scores' && (
        <MyScoresScreen
          scoredTeams={scoredTeams}
          myRatings={myRatings}
          onEdit={(teamId) => handleEditTeam(teamId, true)}
        />
      )}

    </PageShell>
  );
}

// ─── Shell with bottom tab bar ────────────────────────────────────────────────

function PageShell({
  user,
  tab,
  onTabChange,
  scoredCount,
  children,
}: {
  user: string;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  scoredCount: number;
  children: React.ReactNode;
}) {
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

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-divider bg-surface/90 backdrop-blur-sm flex pb-safe">
        <button
          type="button"
          onClick={() => onTabChange('judge')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-display font-500 transition-colors ${
            tab === 'judge' ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="10" cy="10" r="2.5" fill="currentColor" />
          </svg>
          Judge
        </button>
        <button
          type="button"
          onClick={() => onTabChange('scores')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-display font-500 transition-colors relative ${
            tab === 'scores' ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <span className="relative inline-flex">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            {scoredCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-mono font-600 flex items-center justify-center leading-none">
                {scoredCount}
              </span>
            )}
          </span>
          My Scores
        </button>
      </nav>
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
  isEditing,
  scores,
  totalScore,
  note,
  onSlider,
  onNoteChange,
  onSubmit,
  onCancelEdit,
}: {
  team: Team;
  isEditing: boolean;
  scores: Record<string, number>;
  totalScore: number;
  note: string;
  onSlider: (id: string, val: number) => void;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  onCancelEdit?: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Team header */}
      <div className="px-4 pt-5 pb-4 border-b border-divider bg-surface/40">
        <p className={`text-2xs font-display font-500 uppercase tracking-widest mb-1 ${
          isEditing ? 'text-warning' : 'text-primary'
        }`}>
          {isEditing ? '✎ Editing scores' : '● Now Judging'}
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

        {/* Notes */}
        <div>
          <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-2">
            Notes (private to you)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Observations, standouts, things to discuss with other judges…"
            className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-3 text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
          />
          <p className="text-text-muted text-2xs font-body mt-1">
            Notes are saved with your scores and visible only in My Scores.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 pt-4 pb-safe border-t border-divider bg-surface/60 backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between mb-1">
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
        {onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="w-full min-h-[44px] border border-divider text-text-muted rounded-btn text-sm font-display font-500 hover:bg-surface-raised hover:text-text-secondary transition-colors"
          >
            Cancel edit
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

function ConfirmScreen({
  team,
  isEditing,
  scores,
  totalScore,
  note,
  submitting,
  error,
  onConfirm,
  onBack,
}: {
  team: Team;
  isEditing: boolean;
  scores: Record<string, number>;
  totalScore: number;
  note: string;
  submitting: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 py-6">
      <div className="flex-1 overflow-y-auto">
        <h2 className="font-display font-700 text-xl text-text-primary mb-1">
          {isEditing ? 'Update Scores' : 'Confirm Scores'}
        </h2>
        <p className="text-text-secondary text-sm font-body mb-6">
          {isEditing ? 'Updating scores for' : 'Submitting for'}{' '}
          <span className="text-text-primary font-500">{team.teamName}</span>.
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

        {note.trim() && (
          <div className="bg-surface border border-divider rounded-card px-4 py-3 mb-4">
            <p className="text-2xs font-display font-500 text-text-muted uppercase tracking-widest mb-1.5">Your note</p>
            <p className="text-sm text-text-secondary font-body leading-relaxed whitespace-pre-wrap">{note}</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-input bg-danger/10 border border-danger/30 text-danger text-sm font-body mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 pb-safe space-y-3 pt-4">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full min-h-[52px] bg-primary text-white rounded-btn text-md font-display font-700 hover:brightness-110 hover:shadow-glow transition-all disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            isEditing ? 'Save Changes' : 'Confirm & Submit'
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

function SubmittedScreen({
  team,
  total,
  onEdit,
}: {
  team: Team | null;
  total: number;
  onEdit: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14L11 19L22 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="font-display font-700 text-xl text-text-primary mb-2">Scores Submitted</h2>
      {team && (
        <p className="text-text-secondary text-sm font-body mb-1">{team.teamName}</p>
      )}
      {total > 0 && (
        <p className="font-mono text-lg font-600 text-primary mb-6">{total}/50</p>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="mb-6 min-h-[40px] px-5 rounded-btn border border-divider text-text-secondary text-sm font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
      >
        Edit my scores for this team
      </button>

      <div className="flex items-center gap-2 text-text-muted text-sm font-body">
        <div className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
        Waiting for next team...
      </div>
    </div>
  );
}

// ─── My Scores ────────────────────────────────────────────────────────────────

function MyScoresScreen({
  scoredTeams,
  myRatings,
  onEdit,
}: {
  scoredTeams: Team[];
  myRatings: { teamId: string; criterionId: string; score: number; note?: string }[];
  onEdit: (teamId: string) => void;
}) {
  if (scoredTeams.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-surface border border-divider flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#6C63FF" strokeWidth="1.5" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#6C63FF" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-display font-500 text-text-primary text-base mb-1">No scores yet</p>
        <p className="text-text-secondary text-sm font-body max-w-xs">
          Your submitted scores for each team will appear here. You can review and edit them any time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
      <p className="text-2xs font-display font-500 text-text-muted uppercase tracking-widest mb-4">
        {scoredTeams.length} team{scoredTeams.length !== 1 ? 's' : ''} scored
      </p>

      {scoredTeams.map((team) => {
        const teamRatings = myRatings.filter((r) => r.teamId === team.id);
        const byId = Object.fromEntries(teamRatings.map((r) => [r.criterionId, r.score]));
        const total = Object.values(byId).reduce((a, b) => a + b, 0);
        const teamNote = teamRatings[0]?.note ?? '';

        return (
          <div
            key={team.id}
            className="bg-surface border border-divider rounded-card p-4 shadow-card"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="font-display font-600 text-text-primary text-base">{team.teamName}</span>
                <span className="ml-2 text-text-muted font-mono text-xs">#{String(team.order).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-lg font-600 text-primary">{total}<span className="text-text-muted text-sm font-400">/50</span></span>
                <button
                  type="button"
                  onClick={() => onEdit(team.id)}
                  className="min-h-[32px] px-3 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Per-criterion scores */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {CRITERIA.map((c) => {
                const val = byId[c.id] ?? 0;
                const pct = (val / 10) * 100;
                return (
                  <div key={c.id} className="text-center">
                    <div className="font-mono text-sm font-600 text-text-primary">{val}</div>
                    <div className="w-full h-1 bg-divider rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-2xs text-text-muted font-display uppercase tracking-wider mt-1 truncate">
                      {c.shortName}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            {teamNote ? (
              <div className="border-t border-divider pt-3 mt-1">
                <p className="text-2xs font-display font-500 text-text-muted uppercase tracking-widest mb-1">Your note</p>
                <p className="text-sm text-text-secondary font-body leading-relaxed whitespace-pre-wrap">{teamNote}</p>
              </div>
            ) : (
              <div className="border-t border-divider pt-3 mt-1">
                <p className="text-2xs text-text-muted font-body italic">No note added — tap Edit to add one</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
