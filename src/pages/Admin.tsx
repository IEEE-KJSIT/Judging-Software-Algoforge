import React, { useState, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useTeams } from '../hooks/useTeams';
import { useSession } from '../hooks/useSession';
import { useRatings } from '../hooks/useRatings';
import { useJudgePanel } from '../hooks/useJudgePanel';
import { useAllJudges } from '../hooks/useAllJudges';
import { seedTeams, setActiveTeam, deactivateTeam, setTeamStatus } from '../services/teamService';
import { deleteRatingsForTeam } from '../services/ratingService';
import { setJudgePanelActive } from '../services/userService';
import { createJudgeAccount, deleteJudgeDoc } from '../services/judgeManagementService';
import { CRITERIA } from '../constants/criteria';
import { DEFAULT_TEAM_NAMES } from '../constants/teamNames';
import type { Team } from '../types';

type AdminTab = 'event' | 'judges' | 'teams';

const STATUS_STYLES: Record<Team['status'], { label: string; badge: string; border: string }> = {
  active:  { label: '● LIVE',  badge: 'bg-primary/10 text-primary border-primary/20',         border: 'border-l-primary' },
  done:    { label: '✓ Done',  badge: 'bg-success/10 text-success border-success/20',         border: 'border-l-success' },
  pending: { label: 'Pending', badge: 'bg-text-muted/10 text-text-secondary border-divider',  border: 'border-l-divider' },
  absent:  { label: 'Absent',  badge: 'bg-danger/10 text-danger border-danger/20',            border: 'border-l-danger' },
};

export function Admin() {
  const navigate = useNavigate();
  const { teams, loading: teamsLoading } = useTeams();
  const { session } = useSession();
  const { ratings } = useRatings();
  const { judges: panelJudges, judgeCount } = useJudgePanel();
  const { judges: allJudges } = useAllJudges();

  const [activeTab, setActiveTab] = useState<AdminTab>('event');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seedText, setSeedText] = useState(() => DEFAULT_TEAM_NAMES.join('\n'));
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');

  // Create judge form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === session.activeTeamId) ?? null,
    [teams, session.activeTeamId]
  );

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
  const progressPct = judgeCount > 0 ? Math.min(100, (judgesDone / judgeCount) * 100) : 0;

  const stats = useMemo(() => ({
    active:  teams.filter((t) => t.status === 'active').length,
    done:    teams.filter((t) => t.status === 'done').length,
    pending: teams.filter((t) => t.status === 'pending').length,
    absent:  teams.filter((t) => t.status === 'absent').length,
  }), [teams]);

  const isLoading = (key: string) => actionLoading === key;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSeed() {
    const names = seedText.split('\n').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) { setSeedError('Enter at least one team name.'); return; }
    setSeedError('');
    setSeeding(true);
    try { await seedTeams(names); } catch { setSeedError('Failed. Check your connection.'); }
    finally { setSeeding(false); }
  }

  async function handleSetActive(team: Team) {
    setActionLoading(team.id + '_active');
    try { await setActiveTeam(team.id, session.activeTeamId); }
    finally { setActionLoading(null); }
  }

  async function handleMark(team: Team, status: 'done' | 'absent') {
    setActionLoading(team.id + '_' + status);
    try {
      if (team.id === session.activeTeamId) await deactivateTeam(team.id, status);
      else await setTeamStatus(team.id, status);
    } finally { setActionLoading(null); }
  }

  async function handleReset(team: Team) {
    setActionLoading(team.id + '_reset');
    try {
      await deleteRatingsForTeam(team.id);
      await setTeamStatus(team.id, 'pending');
    } finally { setActionLoading(null); }
  }

  async function handleCreateJudge(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    if (newPassword.length < 6) { setCreateError('Password must be at least 6 characters.'); return; }
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const j = await createJudgeAccount(newName, newEmail, newPassword);
      setCreateSuccess(`✓ Created ${j.name} (${j.email})`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code;
      if (msg === 'auth/email-already-in-use') setCreateError('This email already has an account.');
      else if (msg === 'auth/invalid-email') setCreateError('Invalid email address.');
      else setCreateError('Failed to create account. Try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePanel(uid: string, active: boolean) {
    setActionLoading('panel_' + uid);
    try { await setJudgePanelActive(uid, active); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteJudge(uid: string) {
    if (!confirm('Remove this judge entirely? Their Firestore account will be deleted. They can still log in but will see no judging interface.')) return;
    setActionLoading('del_' + uid);
    try { await deleteJudgeDoc(uid); }
    finally { setActionLoading(null); }
  }

  if (teamsLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg pb-safe">

      {/* Header */}
      <header className="sticky top-2 z-50 mx-4 mt-4 mb-4 bg-surface/90 backdrop-blur-md border border-divider rounded-card px-4 py-3 flex items-center justify-between shadow-card">
        <div>
          <h1 className="font-display font-700 text-text-primary text-md leading-none">
            AlgoForge <span className="text-primary">'26</span>
          </h1>
          <p className="text-text-muted text-2xs font-body mt-0.5">Admin Panel</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Tabs */}
      <div className="px-4 mb-4 max-w-5xl mx-auto">
        <div className="flex gap-1 bg-surface border border-divider rounded-card p-1">
          {([
            { id: 'event',  label: 'Event' },
            { id: 'judges', label: `Judges (${judgeCount})` },
            { id: 'teams',  label: `Teams (${teams.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[38px] rounded-btn text-sm font-display font-500 transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 max-w-5xl mx-auto space-y-5">

        {/* ── EVENT TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'event' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Active',  value: stats.active,  color: 'text-primary' },
                { label: 'Done',    value: stats.done,    color: 'text-success' },
                { label: 'Pending', value: stats.pending, color: 'text-text-secondary' },
                { label: 'Absent',  value: stats.absent,  color: 'text-danger' },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-divider rounded-card p-4 text-center shadow-card">
                  <div className={`font-mono text-2xl font-600 ${s.color}`}>{s.value}</div>
                  <div className="text-text-muted text-2xs font-display font-500 uppercase tracking-widest mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Active Team */}
            {activeTeam ? (
              <div className="bg-surface border border-primary/30 rounded-card p-5 shadow-glow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-2xs font-display font-500 text-primary uppercase tracking-widest mb-1">● Now Presenting</p>
                    <h2 className="font-display font-700 text-xl text-text-primary">{activeTeam.teamName}</h2>
                    <p className="text-text-secondary text-xs font-mono mt-1">#{String(activeTeam.order).padStart(2, '0')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-2xl font-600 text-text-primary">
                      {judgesDone}
                      <span className="text-text-muted text-lg">/{judgeCount > 0 ? judgeCount : '—'}</span>
                    </div>
                    <p className="text-text-muted text-2xs font-display uppercase tracking-widest">Judges done</p>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-divider rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>

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
                        {j.email.split('@')[0]}{j.done ? ' ✓' : ` ${j.count}/${CRITERIA.length}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => handleMark(activeTeam, 'done')} disabled={isLoading(activeTeam.id + '_done')}
                    className="min-h-[40px] px-4 bg-success/10 border border-success/20 text-success rounded-btn text-sm font-display font-500 hover:bg-success/20 transition-colors disabled:opacity-60">
                    Mark Done
                  </button>
                  <button onClick={() => handleMark(activeTeam, 'absent')} disabled={isLoading(activeTeam.id + '_absent')}
                    className="min-h-[40px] px-4 bg-danger/10 border border-danger/30 text-danger rounded-btn text-sm font-display font-500 hover:bg-danger/20 transition-colors disabled:opacity-60">
                    Mark Absent
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-divider rounded-card p-5 text-center">
                <p className="text-text-secondary text-sm font-body">No team is currently active.</p>
                <p className="text-text-muted text-xs font-body mt-1">Go to the Teams tab and click <span className="text-text-secondary">Set Active</span> to begin.</p>
              </div>
            )}
          </>
        )}

        {/* ── JUDGES TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'judges' && (
          <>
            {/* Create judge form */}
            <div className="bg-surface border border-divider rounded-card p-5 shadow-card">
              <h2 className="font-display font-700 text-text-primary text-sm mb-1">Add Judge</h2>
              <p className="text-text-muted text-2xs font-body mb-4">
                Creates a Firebase Auth login and adds them to the judging panel instantly.
              </p>

              {createError && (
                <div className="mb-4 px-4 py-3 rounded-input bg-danger/10 border border-danger/30 text-danger text-sm font-body">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="mb-4 px-4 py-3 rounded-input bg-success/10 border border-success/20 text-success text-sm font-body">
                  {createSuccess}
                </div>
              )}

              <form onSubmit={handleCreateJudge} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-1.5">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Dr. Sharma"
                      className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-2.5 text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-1.5">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="judge@example.com"
                      required
                      className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-2.5 text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-1.5">
                    Password <span className="text-danger">*</span>
                    <span className="text-text-muted normal-case tracking-normal ml-2">(min 6 chars — share this with the judge)</span>
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[44px] px-6 bg-primary text-white rounded-btn text-sm font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : 'Create Judge'}
                </button>
              </form>
            </div>

            {/* Judge list */}
            <div className="bg-surface border border-divider rounded-card overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
                <h2 className="font-display font-700 text-text-primary text-sm">
                  All judges
                </h2>
                <span className="font-mono text-xs text-text-muted">{judgeCount} on panel / {allJudges.length} total</span>
              </div>

              {allJudges.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-text-secondary text-sm font-body">No judges yet. Add one above.</p>
                </div>
              ) : (
                <ul className="divide-y divide-divider">
                  {allJudges.map((j) => {
                    const onPanel = j.panelActive !== false;
                    return (
                      <li key={j.uid} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-500 text-text-primary text-sm truncate">
                            {j.name || j.email.split('@')[0]}
                          </p>
                          <p className="font-mono text-text-muted text-2xs truncate">{j.email}</p>
                        </div>

                        <span className={`shrink-0 px-2.5 py-1 rounded-pill text-2xs font-display font-500 border ${
                          onPanel
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-text-muted/10 text-text-secondary border-divider'
                        }`}>
                          {onPanel ? '● Active' : 'Off panel'}
                        </span>

                        <div className="flex gap-2 shrink-0">
                          {onPanel ? (
                            <button
                              type="button"
                              onClick={() => handleTogglePanel(j.uid, false)}
                              disabled={isLoading('panel_' + j.uid)}
                              className="min-h-[36px] px-3 py-1.5 rounded-btn bg-warning/10 border border-warning/20 text-warning text-2xs font-display font-500 hover:bg-warning/20 transition-colors disabled:opacity-60"
                            >
                              {isLoading('panel_' + j.uid) ? '...' : 'Remove from panel'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePanel(j.uid, true)}
                              disabled={isLoading('panel_' + j.uid)}
                              className="min-h-[36px] px-3 py-1.5 rounded-btn bg-primary/10 border border-primary/20 text-primary text-2xs font-display font-500 hover:bg-primary/20 transition-colors disabled:opacity-60"
                            >
                              {isLoading('panel_' + j.uid) ? '...' : 'Restore to panel'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteJudge(j.uid)}
                            disabled={isLoading('del_' + j.uid)}
                            className="min-h-[36px] px-3 py-1.5 rounded-btn bg-danger/10 border border-danger/30 text-danger text-2xs font-display font-500 hover:bg-danger/20 transition-colors disabled:opacity-60"
                          >
                            {isLoading('del_' + j.uid) ? '...' : 'Delete'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ── TEAMS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <>
            {/* First-run seed */}
            {teams.length === 0 && (
              <div className="bg-surface border border-primary/30 rounded-card p-5 shadow-glow-sm">
                <h2 className="font-display font-700 text-text-primary text-md mb-1">First-Time Setup</h2>
                <p className="text-text-secondary text-sm font-body mb-4">
                  Pre-filled with the official AlgoForge '26 team list. Edit if needed — one name per line.
                </p>
                <textarea
                  value={seedText}
                  onChange={(e) => setSeedText(e.target.value)}
                  rows={12}
                  className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                />
                {seedError && <p className="text-danger text-sm mt-2">{seedError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSeedText(DEFAULT_TEAM_NAMES.join('\n'))}
                    className="min-h-[44px] px-4 rounded-btn border border-divider text-text-secondary text-sm font-display font-500 hover:bg-surface-raised hover:text-text-primary transition-colors">
                    Reload official list
                  </button>
                  <button onClick={handleSeed} disabled={seeding}
                    className="min-h-[44px] px-6 bg-primary text-white rounded-btn text-sm font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60">
                    {seeding ? 'Seeding...' : `Seed ${seedText.split('\n').filter((l) => l.trim()).length} teams`}
                  </button>
                </div>
              </div>
            )}

            {teams.length > 0 && (
              <div>
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
                            <button onClick={() => handleSetActive(team)} disabled={isLoading(team.id + '_active')}
                              className="min-h-[36px] px-3 py-1.5 bg-primary text-white rounded-btn text-xs font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60">
                              {isLoading(team.id + '_active') ? '...' : 'Set Active'}
                            </button>
                          )}
                          {team.status !== 'done' && (
                            <button onClick={() => handleMark(team, 'done')} disabled={isLoading(team.id + '_done')}
                              className="min-h-[36px] px-3 py-1.5 bg-success/10 border border-success/20 text-success rounded-btn text-xs font-display font-500 hover:bg-success/20 transition-colors disabled:opacity-60">
                              {isLoading(team.id + '_done') ? '...' : 'Done'}
                            </button>
                          )}
                          {team.status !== 'absent' && (
                            <button onClick={() => handleMark(team, 'absent')} disabled={isLoading(team.id + '_absent')}
                              className="min-h-[36px] px-3 py-1.5 bg-danger/10 border border-danger/30 text-danger rounded-btn text-xs font-display font-500 hover:bg-danger/20 transition-colors disabled:opacity-60">
                              {isLoading(team.id + '_absent') ? '...' : 'Absent'}
                            </button>
                          )}
                          {(team.status === 'done' || team.status === 'absent' || team.status === 'pending') && (
                            <button onClick={() => handleReset(team)} disabled={isLoading(team.id + '_reset')}
                              className="min-h-[36px] px-3 py-1.5 border border-divider text-text-muted rounded-btn text-xs font-display font-500 hover:bg-surface-raised hover:text-text-secondary transition-colors disabled:opacity-60">
                              {isLoading(team.id + '_reset') ? '...' : 'Reset scores'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
