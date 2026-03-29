import type { Criterion } from '../types';

export const CRITERIA: Criterion[] = [
  {
    id: '1',
    name: 'Problem Statement',
    shortName: 'Problem',
    description: 'Is the problem clearly defined and worth solving?',
    maxScore: 10,
  },
  {
    id: '2',
    name: 'Solution & Tech',
    shortName: 'Solution',
    description: 'How well does the solution address the problem? Quality of tech stack?',
    maxScore: 10,
  },
  {
    id: '3',
    name: 'Innovation',
    shortName: 'Innovation',
    description: 'How original and creative is the approach compared to existing solutions?',
    maxScore: 10,
  },
  {
    id: '4',
    name: 'Presentation',
    shortName: 'Presentation',
    description: 'Clarity, confidence, and quality of the demo and pitch.',
    maxScore: 10,
  },
  {
    id: '5',
    name: 'Impact & Scalability',
    shortName: 'Impact',
    description: 'Real-world impact potential and ability to scale.',
    maxScore: 10,
  },
];

export const MAX_TOTAL_SCORE = CRITERIA.reduce((sum, c) => sum + c.maxScore, 0);

/**
 * Tiebreaker priority — checked in order when totals are equal.
 * Criterion IDs: '4' Presentation → '3' Innovation → '2' Solution → '5' Impact → '1' Problem
 */
export const TIEBREAKER_ORDER = ['4', '3', '2', '5', '1'] as const;
