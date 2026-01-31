/**
 * API Client for StorySpark
 * Provides typed fetch wrappers for all API endpoints
 */

import type { Book, Character, Series, Page, Niche, Listing, Setting } from '$lib/db/schema';

// Base API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic fetch wrapper
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data as T;
}

// ============================================================================
// STATS
// ============================================================================

export interface DashboardStats {
  counts: {
    totalBooks: number;
    inProgress: number;
    published: number;
    exported: number;
    thisMonth: number;
    series: number;
    characters: number;
    niches: number;
  };
  recentBooks: {
    id: string;
    title: string;
    bookType: string;
    status: string;
    updatedAt: Date;
  }[];
  analytics?: {
    booksByStatus: {
      draft: number;
      writing: number;
      illustrating: number;
      review: number;
      exported: number;
      published: number;
    };
    booksByType: {
      picture: number;
      board: number;
      early_reader: number;
      activity: number;
      coloring: number;
    };
    monthlyTrends: {
      month: string;
      year: number;
      created: number;
      completed: number;
    }[];
    completionRate: number;
    avgDaysToComplete: number;
  };
  recentActivity?: {
    id: string;
    type: string;
    entityId: string;
    entityName: string;
    entityType: string;
    timestamp: Date | string;
    description: string;
  }[];
}

export async function getStats(): Promise<DashboardStats> {
  return fetchApi<DashboardStats>('/api/stats');
}

// ============================================================================
// BOOKS
// ============================================================================

export async function getBooks(params?: {
  status?: string;
  seriesId?: string;
  page?: number;
  limit?: number;
}): Promise<Book[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.seriesId) searchParams.set('seriesId', params.seriesId);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchApi<Book[]>(`/api/books${query ? `?${query}` : ''}`);
}

export async function getBook(id: string): Promise<Book> {
  return fetchApi<Book>(`/api/books/${id}`);
}

export async function createBook(data: Partial<Book>): Promise<Book> {
  return fetchApi<Book>('/api/books', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBook(id: string, data: Partial<Book>): Promise<Book> {
  return fetchApi<Book>(`/api/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteBook(id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/api/books/${id}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// PAGES
// ============================================================================

export async function getBookPages(bookId: string): Promise<Page[]> {
  return fetchApi<Page[]>(`/api/books/${bookId}/pages`);
}

export async function updateBookPages(
  bookId: string,
  pages: Partial<Page>[]
): Promise<Page[]> {
  return fetchApi<Page[]>(`/api/books/${bookId}/pages`, {
    method: 'PUT',
    body: JSON.stringify({ pages })
  });
}

export async function updatePage(
  bookId: string,
  pageId: string,
  data: Partial<Page>
): Promise<Page> {
  return fetchApi<Page>(`/api/books/${bookId}/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ============================================================================
// CHARACTERS
// ============================================================================

export async function getCharacters(seriesId?: string): Promise<Character[]> {
  const query = seriesId ? `?seriesId=${seriesId}` : '';
  return fetchApi<Character[]>(`/api/characters${query}`);
}

export async function getCharacter(id: string): Promise<Character> {
  return fetchApi<Character>(`/api/characters/${id}`);
}

export async function createCharacter(data: Partial<Character>): Promise<Character> {
  return fetchApi<Character>('/api/characters', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character> {
  return fetchApi<Character>(`/api/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteCharacter(id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/api/characters/${id}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// SERIES
// ============================================================================

export interface SeriesWithRelations extends Series {
  books: Book[];
  characters: Character[];
}

export async function getAllSeries(): Promise<Series[]> {
  return fetchApi<Series[]>('/api/series');
}

export async function getSeries(id: string): Promise<SeriesWithRelations> {
  return fetchApi<SeriesWithRelations>(`/api/series/${id}`);
}

export async function createSeries(data: Partial<Series>): Promise<Series> {
  return fetchApi<Series>('/api/series', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSeries(id: string, data: Partial<Series>): Promise<Series> {
  return fetchApi<Series>(`/api/series/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteSeries(id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/api/series/${id}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// NICHES
// ============================================================================

export async function getNiches(): Promise<Niche[]> {
  return fetchApi<Niche[]>('/api/niches');
}

export async function getNiche(id: string): Promise<Niche> {
  return fetchApi<Niche>(`/api/niches/${id}`);
}

export async function createNiche(data: Partial<Niche>): Promise<Niche> {
  return fetchApi<Niche>('/api/niches', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateNiche(id: string, data: Partial<Niche>): Promise<Niche> {
  return fetchApi<Niche>(`/api/niches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteNiche(id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/api/niches/${id}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// LISTINGS
// ============================================================================

export async function getListings(bookId?: string): Promise<Listing[]> {
  const query = bookId ? `?bookId=${bookId}` : '';
  return fetchApi<Listing[]>(`/api/listings${query}`);
}

export async function createListing(data: Partial<Listing>): Promise<Listing> {
  return fetchApi<Listing>('/api/listings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
  return fetchApi<Listing>(`/api/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ============================================================================
// AI GENERATION
// ============================================================================

import type { StoryOutline, GeneratedListing, GeneratedCharacter } from '$lib/services/claude';
import type { ImageResult } from '$lib/services/openai';

export async function generateOutline(data: {
  bookType: string;
  targetAge: string;
  concept: string;
  characters?: { name: string; description: string }[];
  tone?: string;
  themes?: string[];
}): Promise<StoryOutline> {
  return fetchApi<StoryOutline>('/api/generate/outline', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generatePageText(data: {
  bookType: string;
  targetAge: string;
  storyContext: string;
  pageNumber: number;
  pageSummary: string;
  previousPages?: { pageNumber: number; text: string }[];
}): Promise<{ text: string }> {
  return fetchApi<{ text: string }>('/api/generate/page-text', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generateListingContent(data: {
  title: string;
  bookType: string;
  targetAge: string;
  storySummary: string;
  themes?: string[];
  characters?: string[];
}): Promise<GeneratedListing> {
  return fetchApi<GeneratedListing>('/api/generate/listing', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generateCharacterProfile(data: {
  name: string;
  basicDescription: string;
  bookType: string;
  targetAge: string;
  role?: string;
  storyContext?: string;
}): Promise<GeneratedCharacter> {
  return fetchApi<GeneratedCharacter>('/api/generate/character', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generateCharacterImage(data: {
  characterId: string;
  name: string;
  visualDescription: string;
  style: string;
}): Promise<ImageResult> {
  return fetchApi<ImageResult>('/api/generate/character-image', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generatePageIllustration(data: {
  bookId: string;
  pageId?: string;
  pageNumber: number;
  prompt: string;
  style: string;
  characterReferences?: { name: string; imagePath: string }[];
}): Promise<ImageResult> {
  return fetchApi<ImageResult>('/api/generate/page-illustration', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generateCover(data: {
  bookId: string;
  title: string;
  subtitle?: string;
  style: string;
  mainCharacter?: { name: string; visualDescription: string };
  scene?: string;
  mood?: string;
}): Promise<ImageResult> {
  return fetchApi<ImageResult>('/api/generate/cover', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export interface IllustrationStyle {
  id: string;
  name: string;
  description: string;
}

export async function getIllustrationStyles(): Promise<IllustrationStyle[]> {
  return fetchApi<IllustrationStyle[]>('/api/generate/styles');
}

// ============================================================================
// EXPORTS
// ============================================================================

export interface ExportJob {
  id: string;
  bookId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  filePath?: string;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

export interface ExportConfig {
  bookId: string;
  type: 'interior' | 'cover' | 'complete';
  trimSize?: string;
  paperType?: 'white' | 'cream';
  includeBleed?: boolean;
  colorMode?: 'color' | 'bw';
}

export async function createExport(config: ExportConfig): Promise<ExportJob> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create export');
  }

  return response.json();
}

export async function getExportStatus(exportId: string): Promise<ExportJob> {
  const response = await fetch(`/api/export/${exportId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get export status');
  }

  return response.json();
}

export async function getBookExports(bookId: string): Promise<ExportJob[]> {
  const response = await fetch(`/api/export?bookId=${bookId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get exports');
  }

  return response.json();
}

export async function deleteExport(exportId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/export/${exportId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete export');
  }

  return response.json();
}

export function getExportDownloadUrl(exportId: string): string {
  return `/api/export/${exportId}/download`;
}

/**
 * Poll for export completion
 */
export async function waitForExport(
  exportId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<ExportJob> {
  const { maxAttempts = 60, intervalMs = 2000 } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getExportStatus(exportId);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Export timed out');
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface SettingItem {
  key: string;
  value: string;
  category: string;
  isDefault?: boolean;
  updatedAt?: Date;
}

export async function getSettings(category?: string): Promise<SettingItem[]> {
  const query = category ? `?category=${category}` : '';
  return fetchApi<SettingItem[]>(`/api/settings${query}`);
}

export async function updateSettings(settings: Record<string, string>): Promise<SettingItem[]> {
  return fetchApi<SettingItem[]>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

export async function updateSetting(key: string, value: string): Promise<Setting> {
  return fetchApi<Setting>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value })
  });
}

export async function testApiConnection(type: 'anthropic' | 'openai', apiKey: string): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>('/api/settings/test', {
    method: 'POST',
    body: JSON.stringify({ type, apiKey })
  });
}
