import type { RequestHandler } from './$types';
import { getDb, series } from '$lib/db';
import { desc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired, getPagination } from '$lib/api/utils';
import type { NewSeries } from '$lib/db/schema';

/**
 * GET /api/series - List all series
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const { limit, offset } = getPagination(url);

    const allSeries = await db
      .select()
      .from(series)
      .orderBy(desc(series.updatedAt))
      .limit(limit)
      .offset(offset);

    return success(allSeries);
  } catch (err) {
    console.error('Error fetching series:', err);
    return failure('Failed to fetch series', 500);
  }
};

/**
 * POST /api/series - Create a new series
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Partial<NewSeries>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['name']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();
    const id = generateId();
    const timestamp = now();

    const newSeries: NewSeries = {
      id,
      name: body.name!,
      description: body.description || null,
      targetAge: body.targetAge || null,
      genre: body.genre || null,
      keywords: body.keywords || null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(series).values(newSeries);

    return success(newSeries, 201);
  } catch (err) {
    console.error('Error creating series:', err);
    return failure('Failed to create series', 500);
  }
};
