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
 */
export function generateId(): string {
  return crypto.randomUUID();
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
