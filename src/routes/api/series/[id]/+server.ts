import type { RequestHandler } from './$types';
import { getDb, series, books, characters } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Series } from '$lib/db/schema';

/**
 * GET /api/series/[id] - Get a series with its books and characters
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const seriesResult = await db.select().from(series).where(eq(series.id, params.id)).limit(1);
    if (seriesResult.length === 0) {
      return failure('Series not found', 404);
    }

    // Get books in this series
    const seriesBooks = await db.select().from(books).where(eq(books.seriesId, params.id));

    // Get characters in this series
    const seriesCharacters = await db.select().from(characters).where(eq(characters.seriesId, params.id));

    return success({
      ...seriesResult[0],
      books: seriesBooks,
      characters: seriesCharacters
    });
  } catch (err) {
    console.error('Error fetching series:', err);
    return failure('Failed to fetch series', 500);
  }
};

/**
 * PUT /api/series/[id] - Update a series
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Series>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db.select().from(series).where(eq(series.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Series not found', 404);
    }

    const updateData: Partial<Series> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(series).set(updateData).where(eq(series.id, params.id));

    const updated = await db.select().from(series).where(eq(series.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating series:', err);
    return failure('Failed to update series', 500);
  }
};

/**
 * DELETE /api/series/[id] - Delete a series (books/characters become orphaned)
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const existing = await db.select().from(series).where(eq(series.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Series not found', 404);
    }

    // Note: Due to ON DELETE SET NULL, books will have seriesId set to null
    // and characters will be deleted (ON DELETE CASCADE)
    await db.delete(series).where(eq(series.id, params.id));

    return success({ deleted: true, id: params.id });
  } catch (err) {
    console.error('Error deleting series:', err);
    return failure('Failed to delete series', 500);
  }
};
