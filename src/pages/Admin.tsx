import React, { useState, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useSession } from '../hooks/useSession';
import { useRatings } from '../hooks/useRatings';
import { seedTeams, setActiveTeam, deactivateTeam, setTeamStatus } from '../services/teamService';
import { CRITERIA, TOTAL_JUDGES } from '../constants/criteria';
import type { Team } from '../types';

const STATUS_STYLES: Record<Team['status'], { label: string; dot: string; badge: string; border: string }> = {
  active:  { label: '● LIVE',   dot: '#6C63FF', badge: 'bg-primary/10 text-primary border-primary/20',     border: 'border-l-primary' },
  done:    { label: '✓ Done',   dot: '#22C55E', badge: 'bg-success/10 text-success border-success/20',     border: 'border-l-success' },
  pending: { label: 'Pending',  dot: '#44445A', badge: 'bg-text-muted/10 text-text-secondary border-divider', border: 'border-l-divider' },
  absent:  { label: 'Absent',   dot: '#EF4444', badge: 'bg-danger/10 text-danger border-danger/20',         border: 'border-l-danger' },
};

export function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { session } = useSession();
  const { ratings } = useRatings();

  const [seedText, setSeedText] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === session.activeTeamId) ?? null,
    [teams, session.activeTeamId]
  );

  // Judge progress for active team
  const judgeProgress = useMemo(() => {
    if (!activeTeam) return [];
    const teamRatings = ratings.filter((r) => r.teamId === activeTeam.id);
    const byJudge: Record<string, Set<string>> = {};
    teamRatings.forEach((r) => {
      if (!byJudge[r.judgeEmail]) byJudge[r.judgeEmail] = new Set();
      byJudge[r.judgeEmail].add(r.criterionId);
    });
    return Object.entries(byJudge).map(([email, criteria]) => ({
      email,
      count: criteria.size,
      done: criteria.size === CRITERIA.length,
    }));
  }, [ratings, activeTeam]);

  const judgesDone = judgeProgress.filter((j) => j.done).length;

  const stats = useMemo(() => ({
    active:  teams.filter((t) => t.status === 'active').length,
    done:    teams.filter((t) => t.status === 'done').length,
    pending: teams.filter((t) => t.status === 'pending').length,
    absent:  teams.filter((t) => t.status === 'absent').length,
  }), [teams]);

  async function handleSeed() {
    const names = seedText.split('\n').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) { setSeedError('Please enter at least one team name.'); return; }
    setSeedError('');
    setSeeding(true);
    try {
      await seedTeams(names);
    } catch {
      setSeedError('Failed to seed teams. Check your Firebase connection.');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSetActive(team: Team) {
    setActionLoading(team.id + '_active');
    try {
      await setActiveTeam(team.id, session.activeTeamId);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMark(team: Team, status: 'done' | 'absent') {
    setActionLoading(team.id + '_' + status);
    try {
      if (team.id === session.activeTeamId) {
        await deactivateTeam(team.id, status);
      } else {
        await setTeamStatus(team.id, status);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReset(team: Team) {
    setActionLoading(team.id + '_reset');
    try {
      await setTeamStatus(team.id, 'pending');
    } finally {
      setActionLoading(null);
    }
  }

  const isLoading = (key: string) => actionLoading === key;

  if (teamsLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-safe">
      {/* Header */}
      <header className="sticky top-2 z-50 mx-4 mt-4 mb-6 bg-surface/90 backdrop-blur-md border border-divider rounded-card px-4 py-3 flex items-center justify-between shadow-card">
        <div>
          <h1 className="font-display font-700 text-text-primary text-md leading-none">
            AlgoForge <span className="text-primary">'26</span>
          </h1>
          <p className="text-text-muted text-2xs font-body mt-0.5">Admin Panel</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leaderboard')}
            className="min-h-[36px] px-3 py-1.5 rounded-btn border border-divider text-text-secondary text-xs font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors"
          >
            Leaderboard
          </button>
          <button
            onClick={() => signOut(auth)}
            className="min-h-[36px] px-3 py-1.5 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-display font-500 hover:bg-danger/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="px-4 max-w-5xl mx-auto space-y-6">

        {/* First-run: Seed Teams */}
        {teams.length === 0 && (
          <div className="bg-surface border border-primary/30 rounded-card p-6 shadow-glow-sm">
            <h2 className="font-display font-700 text-text-primary text-md mb-1">
              First-Time Setup
            </h2>
            <p className="text-text-secondary text-sm font-body mb-4">
              No teams found. Paste your team names below — one per line — then click Seed Teams.
            </p>
            <textarea
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder={'Team Voldemort\nCode Blooded\nSyntax Error\n...'}
              rows={10}
              className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            />
            {seedError && <p className="text-danger text-sm mt-2">{seedError}</p>}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4 min-h-[44px] px-6 bg-primary text-white rounded-btn text-sm font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60"
            >
              {seeding ? 'Seeding...' : `Seed ${seedText.split('\n').filter((l) => l.trim()).length} Teams`}
            </button>
          </div>
        )}

        {teams.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Active', value: stats.active, color: 'text-primary' },
                { label: 'Done',   value: stats.done,   color: 'text-success' },
                { label: 'Pending',value: stats.pending, color: 'text-text-secondary' },
                { label: 'Absent', value: stats.absent,  color: 'text-danger' },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-divider rounded-card p-4 text-center shadow-card">
                  <div className={`font-mono text-2xl font-600 ${s.color}`}>{s.value}</div>
                  <div className="text-text-muted text-2xs font-display font-500 uppercase tracking-widest mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Active Team Panel */}
            {activeTeam && (
              <div className="bg-surface border border-primary/30 rounded-card p-5 shadow-glow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-2xs font-display font-500 text-primary uppercase tracking-widest mb-1">● Now Presenting</p>
                    <h2 className="font-display font-700 text-xl text-text-primary">{activeTeam.teamName}</h2>
                    <p className="text-text-secondary text-xs font-mono mt-1">
                      #{String(activeTeam.order).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-2xl font-600 text-text-primary">
                      {judgesDone}
                      <span className="text-text-muted text-lg">/{TOTAL_JUDGES}</span>
                    </div>
                    <p className="text-text-muted text-2xs font-display uppercase tracking-widest">Judges Done</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-divider rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(judgesDone / TOTAL_JUDGES) * 100}%` }}
                  />
                </div>

                {/* Judge breakdown */}
                {judgeProgress.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {judgeProgress.map((j) => (
                      <span
                        key={j.email}
                        className={`px-2.5 py-1 rounded-pill text-2xs font-mono border ${
                          j.done
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {j.email.split('@')[0]}
                        {j.done ? ' ✓' : ` ${j.count}/${CRITERIA.length}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleMark(activeTeam, 'done')}
                    disabled={isLoading(activeTeam.id + '_done')}
                    className="min-h-[40px] px-4 bg-success/10 border border-success/20 text-success rounded-btn text-sm font-display font-500 hover:bg-success/20 transition-colors disabled:opacity-60"
                  >
                    Mark Done
                  </button>
                  <button
                    onClick={() => handleMark(activeTeam, 'absent')}
                    disabled={isLoading(activeTeam.id + '_absent')}
                    className="min-h-[40px] px-4 bg-danger/10 border border-danger/30 text-danger rounded-btn text-sm font-display font-500 hover:bg-danger/20 transition-colors disabled:opacity-60"
                  >
                    Mark Absent
                  </button>
                </div>
              </div>
            )}

            {/* Team Grid */}
            <div>
              <h2 className="font-display font-500 text-text-secondary text-2xs uppercase tracking-widest mb-3">
                All Teams — {teams.length} total
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team) => {
                  const style = STATUS_STYLES[team.status];
                  const isActive = team.id === session.activeTeamId;
                  return (
                    <div
                      key={team.id}
                      className={`bg-surface border border-divider border-l-4 ${style.border} rounded-card p-4 shadow-card transition-all ${isActive ? 'ring-1 ring-primary/30' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-mono text-text-muted text-2xs mb-1">#{String(team.order).padStart(2, '0')}</p>
                          <h3 className="font-display font-500 text-text-primary text-base truncate">{team.teamName}</h3>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-pill text-2xs font-display font-500 border ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {team.status !== 'active' && (
                          <button
                            onClick={() => handleSetActive(team)}
                            disabled={isLoading(team.id + '_active')}
                            className="min-h-[36px] px-3 py-1.5 bg-primary text-white rounded-btn text-xs font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60"
                          >
                            {isLoading(team.id + '_active') ? '...' : 'Set Active'}
                          </button>
                        )}
                        {team.status !== 'done' && (
                          <button
                            onClick={() => handleMark(team, 'done')}
                            disabled={isLoading(team.id + '_done')}
                            className="min-h-[36px] px-3 py-1.5 bg-success/10 border border-success/20 text-success rounded-btn text-xs font-display font-500 hover:bg-success/20 transition-colors disabled:opacity-60"
                          >
                            {isLoading(team.id + '_done') ? '...' : 'Done'}
                          </button>
                        )}
                        {team.status !== 'absent' && (
                          <button
                            onClick={() => handleMark(team, 'absent')}
                            disabled={isLoading(team.id + '_absent')}
                            className="min-h-[36px] px-3 py-1.5 bg-danger/10 border border-danger/30 text-danger rounded-btn text-xs font-display font-500 hover:bg-danger/20 transition-colors disabled:opacity-60"
                          >
                            {isLoading(team.id + '_absent') ? '...' : 'Absent'}
                          </button>
                        )}
                        {(team.status === 'done' || team.status === 'absent') && (
                          <button
                            onClick={() => handleReset(team)}
                            disabled={isLoading(team.id + '_reset')}
                            className="min-h-[36px] px-3 py-1.5 border border-divider text-text-muted rounded-btn text-xs font-display font-500 hover:bg-surface-raised hover:text-text-secondary transition-colors disabled:opacity-60"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
