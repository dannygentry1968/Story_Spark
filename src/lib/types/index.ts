// ============================================================================
// Book Types & Constants
// ============================================================================

export const BOOK_TYPES = {
  picture: {
    id: 'picture',
    name: 'Picture Book',
    description: 'Illustrated storybook with narrative arc',
    pageCount: 32,
    spreads: 14,
    ages: ['0-2', '3-5', '5-8'],
    trimSizes: ['8x8', '8.5x8.5', '8x10'],
    icon: '📖'
  },
  board: {
    id: 'board',
    name: 'Board Book',
    description: 'Simple concepts for babies & toddlers',
    pageCount: 14,
    spreads: 6,
    ages: ['0-2'],
    trimSizes: ['6x6', '7x7'],
    icon: '👶'
  },
  early_reader: {
    id: 'early_reader',
    name: 'Early Reader',
    description: 'Chapter book for transitioning readers',
    pageCount: 48,
    chapters: 6,
    ages: ['5-8', '8-12'],
    trimSizes: ['5x8', '5.5x8.5', '6x9'],
    icon: '📚'
  },
  activity: {
    id: 'activity',
    name: 'Activity Book',
    description: 'Mazes, puzzles, matching, tracing',
    pageCount: 64,
    ages: ['3-5', '5-8', '8-12'],
    trimSizes: ['8x10', '8.5x11'],
    icon: '🧩'
  },
  coloring: {
    id: 'coloring',
    name: 'Coloring Book',
    description: 'Line art for coloring',
    pageCount: 50,
    ages: ['3-5', '5-8', '8-12'],
    trimSizes: ['8x10', '8.5x11'],
    icon: '🎨'
  }
} as const;

export type BookTypeId = keyof typeof BOOK_TYPES;

export const AGE_RANGES = {
  '0-2': { label: 'Baby/Toddler (0-2)', wordRange: [0, 100] },
  '3-5': { label: 'Preschool (3-5)', wordRange: [100, 500] },
  '5-8': { label: 'Early Elementary (5-8)', wordRange: [300, 1000] },
  '8-12': { label: 'Middle Grade (8-12)', wordRange: [500, 3000] }
} as const;

export type AgeRange = keyof typeof AGE_RANGES;

export const BOOK_STATUS = {
  draft: { label: 'Draft', color: 'gray' },
  writing: { label: 'Writing', color: 'blue' },
  illustrating: { label: 'Illustrating', color: 'purple' },
  review: { label: 'Review', color: 'yellow' },
  exported: { label: 'Exported', color: 'green' },
  published: { label: 'Published', color: 'spark' }
} as const;

export type BookStatus = keyof typeof BOOK_STATUS;

// ============================================================================
// KDP Specifications
// ============================================================================

export const TRIM_SIZES = {
  '5x8': { width: 5, height: 8, spine: 0.06, bleed: 0.125 },
  '5.5x8.5': { width: 5.5, height: 8.5, spine: 0.06, bleed: 0.125 },
  '6x6': { width: 6, height: 6, spine: 0.04, bleed: 0.125 },
  '6x9': { width: 6, height: 9, spine: 0.06, bleed: 0.125 },
  '7x7': { width: 7, height: 7, spine: 0.05, bleed: 0.125 },
  '8x8': { width: 8, height: 8, spine: 0.06, bleed: 0.125 },
  '8x10': { width: 8, height: 10, spine: 0.06, bleed: 0.125 },
  '8.5x8.5': { width: 8.5, height: 8.5, spine: 0.06, bleed: 0.125 },
  '8.5x11': { width: 8.5, height: 11, spine: 0.06, bleed: 0.125 }
} as const;

export type TrimSize = keyof typeof TRIM_SIZES;

// ============================================================================
// Workflow Steps
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const PROFIT_PIPELINE: WorkflowStep[] = [
  { id: 'discover', name: 'Discover', description: 'Research niches and trends', icon: '🔍' },
  { id: 'plan', name: 'Plan', description: 'Define concept and structure', icon: '📋' },
  { id: 'create', name: 'Create', description: 'Generate story content', icon: '✍️' },
  { id: 'illustrate', name: 'Illustrate', description: 'Create consistent visuals', icon: '🎨' },
  { id: 'polish', name: 'Polish', description: 'Edit and refine', icon: '✨' },
  { id: 'export', name: 'Export', description: 'Generate KDP-ready PDF', icon: '📤' },
  { id: 'listing', name: 'Listing', description: 'Optimize for discoverability', icon: '🏷️' },
  { id: 'track', name: 'Track', description: 'Monitor performance', icon: '📈' }
];

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// AI Generation Types
// ============================================================================

export interface StoryOutline {
  title: string;
  theme: string;
  targetAge: AgeRange;
  characters: {
    name: string;
    description: string;
    role: string;
  }[];
  chapters?: {
    number: number;
    title: string;
    summary: string;
  }[];
  pages?: {
    number: number;
    summary: string;
    illustration: string;
  }[];
}

export interface GeneratedPage {
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
  layout: string;
}

export interface CharacterReference {
  name: string;
  visualDescription: string;
  referenceImageUrl?: string;
}
