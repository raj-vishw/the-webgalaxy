import type { UniverseDefinition } from '../types/galaxy'

/**
 * The universes of The WebGalaxy.
 *
 * All universes are equal, independent regions of The WebGalaxy. The order of
 * this array is only used for the staggered reveal in the intro animation and
 * carries no meaning about importance. Websites belong to a universe via
 * `WebsiteDefinition.universeId` (see `websites.ts`); the `layout` field only
 * shapes how a universe's interior looks and moves.
 *
 * Layout notes: positions were chosen for an organic, non-grid feel and then
 * checked against both overview cameras (landscape and portrait) so no two
 * structures or labels overlap on screen. They span roughly x ∈ [-90, 90],
 * y ∈ [-12, 18], z ∈ [-70, 38].
 */
export const universes: UniverseDefinition[] = [
  {
    id: 'ai',
    name: 'AI',
    description: 'Artificial intelligence and machine intelligence',
    position: [-36, 2, -12],
    scale: 12,
    visualType: 'spiral',
    palette: { core: '#f3f6ff', primary: '#8fb0ff', secondary: '#c9d7ff' },
    seed: 11,
    layout: { spread: [0.8, 0.42, 0.7], coreBias: 0.6, energy: 1.2, dust: 1.5 },
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Security research, defense, and privacy',
    position: [-64, -8, 16],
    scale: 9,
    visualType: 'cluster',
    palette: { core: '#eafcff', primary: '#6fd3e6', secondary: '#a9c8ff' },
    seed: 23,
    layout: { spread: [1.18, 0.6, 1.0], coreBias: 0.15, energy: 0.7, dust: 0.5 },
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Software engineering, tools, and open source',
    position: [-16, -12, 38],
    scale: 13,
    visualType: 'stream',
    palette: { core: '#ffffff', primary: '#b9c6ff', secondary: '#7f95e6' },
    seed: 37,
    layout: { spread: [0.9, 0.32, 0.7], coreBias: 0.5, energy: 0.9, dust: 0.9 },
  },
  {
    id: 'design',
    name: 'Design',
    description: 'Visual design, typography, and creative work',
    position: [10, 6, 14],
    scale: 11,
    visualType: 'nebula',
    palette: { core: '#fff2f8', primary: '#d99ac9', secondary: '#8f7fd6' },
    seed: 41,
    layout: { spread: [0.85, 0.5, 0.85], coreBias: 0.4, energy: 1.0, dust: 1.7 },
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Games, players, and interactive worlds',
    position: [50, -2, -30],
    scale: 12,
    visualType: 'spiral',
    palette: { core: '#f6f0ff', primary: '#a98bff', secondary: '#7ea0ff' },
    seed: 53,
    layout: { spread: [0.85, 0.45, 0.75], coreBias: 0.5, energy: 1.6, dust: 1.1 },
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Learning, teaching, and knowledge',
    position: [-84, 16, -62],
    scale: 9,
    visualType: 'cluster',
    palette: { core: '#fff9ee', primary: '#f0dcb4', secondary: '#c9d1ff' },
    seed: 67,
    layout: { spread: [1.05, 0.5, 0.95], coreBias: 0.3, energy: 0.55, dust: 0.6 },
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Research, discovery, and the natural world',
    position: [50, -10, 36],
    scale: 10,
    visualType: 'planetary',
    palette: { core: '#f2f8ff', primary: '#9dc4ff', secondary: '#d5e6ff' },
    seed: 71,
    layout: { spread: [0.9, 0.38, 0.8], coreBias: 0.45, energy: 0.85, dust: 0.8 },
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Markets, money, and economics',
    position: [78, 4, 6],
    scale: 12,
    visualType: 'stream',
    palette: { core: '#fffaf0', primary: '#e6d3ad', secondary: '#a4b6e6' },
    seed: 83,
    layout: { spread: [0.9, 0.4, 0.75], coreBias: 0.55, energy: 1.0, dust: 0.7 },
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Sound, artists, and listening',
    position: [2, 18, -70],
    scale: 11,
    visualType: 'nebula',
    palette: { core: '#f5f1ff', primary: '#a794f2', secondary: '#6f8ee6' },
    seed: 97,
    layout: { spread: [0.85, 0.5, 0.8], coreBias: 0.4, energy: 1.1, dust: 1.3 },
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Film, streaming, and culture',
    position: [90, 16, -62],
    scale: 10,
    visualType: 'planetary',
    palette: { core: '#fff6f0', primary: '#f0c4b0', secondary: '#b8b0f0' },
    seed: 101,
    layout: { spread: [0.9, 0.45, 0.8], coreBias: 0.5, energy: 1.2, dust: 1.0 },
  },
]
