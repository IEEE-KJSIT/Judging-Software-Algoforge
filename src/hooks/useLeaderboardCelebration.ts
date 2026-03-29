import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { TeamScore } from '../utils/leaderboardCalc';

function burst() {
  const count = 200;
  const defaults = { origin: { y: 0.65 }, zIndex: 9999 };

  function fire(particleRatio: number, opts: Record<string, unknown>) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: ['#6C63FF', '#9D96FF', '#22C55E', '#F0F0FF', '#FFD700'],
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

/**
 * Confetti burst when the #1 ranked team (with real scores) changes.
 */
export function useLeaderboardCelebration(scores: TeamScore[], enabled = true) {
  const prevTopId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const top = scores[0];
    if (!top?.hasScores) {
      return;
    }

    const id = top.team.id;

    if (!initialized.current) {
      initialized.current = true;
      prevTopId.current = id;
      return;
    }

    if (prevTopId.current !== id) {
      burst();
      prevTopId.current = id;
    }
  }, [scores, enabled]);
}
