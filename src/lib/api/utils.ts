import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Standard API response wrapper
 */
export function success<T>(data: T, status = 200) {
  return json({ success: true, data }, { status });
}

export function failure(message: string, status = 400) {
  return json({ success: false, error: message }, { status });
}

/**
 * Parse JSON body safely
 */
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Generate a unique ID (UUID v4 format)
 * Includes fallback for insecure contexts (HTTP)
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Falls through to fallback
    }
  }
  // Fallback for insecure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get current timestamp for database
 */
export function now(): Date {
  return new Date();
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Pagination helper
 */
export function getPagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
