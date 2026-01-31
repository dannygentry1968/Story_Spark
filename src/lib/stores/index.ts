import { writable, derived } from 'svelte/store';
import type { Book, Character, Series, Niche } from '$lib/db/schema';
import type { DashboardStats } from '$lib/api/client';

// ============================================================================
// LOADING & ERROR STATE
// ============================================================================

export const isLoading = writable(false);
export const error = writable<string | null>(null);

export function setLoading(loading: boolean) {
  isLoading.set(loading);
  if (loading) error.set(null);
}

export function setError(message: string) {
  error.set(message);
  isLoading.set(false);
}

export function clearError() {
  error.set(null);
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export const stats = writable<DashboardStats | null>(null);

// ============================================================================
// BOOKS
// ============================================================================

export const books = writable<Book[]>([]);
export const currentBook = writable<Book | null>(null);

export const booksByStatus = derived(books, ($books) => {
  return {
    draft: $books.filter(b => b.status === 'draft'),
    writing: $books.filter(b => b.status === 'writing'),
    illustrating: $books.filter(b => b.status === 'illustrating'),
    review: $books.filter(b => b.status === 'review'),
    exported: $books.filter(b => b.status === 'exported'),
    published: $books.filter(b => b.status === 'published')
  };
});

// ============================================================================
// CHARACTERS
// ============================================================================

export const characters = writable<Character[]>([]);
export const currentCharacter = writable<Character | null>(null);

export const charactersById = derived(characters, ($characters) => {
  return Object.fromEntries($characters.map(c => [c.id, c]));
});

// ============================================================================
// SERIES
// ============================================================================

export const allSeries = writable<Series[]>([]);
export const currentSeries = writable<Series | null>(null);

// ============================================================================
// NICHES
// ============================================================================

export const niches = writable<Niche[]>([]);
export const currentNiche = writable<Niche | null>(null);

// ============================================================================
// UI STATE
// ============================================================================

export const sidebarOpen = writable(true);
export const modalOpen = writable(false);
export const modalContent = writable<string | null>(null);

export function openModal(content: string) {
  modalContent.set(content);
  modalOpen.set(true);
}

export function closeModal() {
  modalOpen.set(false);
  modalContent.set(null);
}

// ============================================================================
// GENERATION STATE
// ============================================================================

export interface GenerationJob {
  id: string;
  type: 'outline' | 'pageText' | 'listing' | 'character' | 'image';
  status: 'pending' | 'running' | 'complete' | 'error';
  progress?: number;
  result?: unknown;
  error?: string;
}

export const generationJobs = writable<GenerationJob[]>([]);

export function addGenerationJob(job: Omit<GenerationJob, 'status'>): string {
  const newJob: GenerationJob = { ...job, status: 'pending' };
  generationJobs.update(jobs => [...jobs, newJob]);
  return job.id;
}

export function updateGenerationJob(id: string, updates: Partial<GenerationJob>) {
  generationJobs.update(jobs =>
    jobs.map(job => job.id === id ? { ...job, ...updates } : job)
  );
}

export function removeGenerationJob(id: string) {
  generationJobs.update(jobs => jobs.filter(job => job.id !== id));
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const toasts = writable<Toast[]>([]);

export function addToast(toast: Omit<Toast, 'id'>): string {
  const id = crypto.randomUUID();
  const newToast = { ...toast, id };
  toasts.update(t => [...t, newToast]);

  // Auto-remove after duration
  const duration = toast.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}

export function removeToast(id: string) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export function showSuccess(message: string) {
  return addToast({ type: 'success', message });
}

export function showError(message: string) {
  return addToast({ type: 'error', message, duration: 8000 });
}

export function showInfo(message: string) {
  return addToast({ type: 'info', message });
}
