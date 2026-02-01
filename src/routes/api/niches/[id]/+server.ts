import type { RequestHandler } from './$types';
import { getDb, niches } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Niche } from '$lib/db/schema';

/**
 * GET /api/niches/[id] - Get a single niche
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();
    const result = await db.select().from(niches).where(eq(niches.id, params.id)).limit(1);

    if (result.length === 0) {
      return failure('Niche not found', 404);
    }

    // Parse JSON arrays from TEXT fields
    const niche = {
      ...result[0],
      keywords: result[0].keywords ? JSON.parse(result[0].keywords) : null,
      bookIdeas: result[0].bookIdeas ? JSON.parse(result[0].bookIdeas) : null
    };

    return success(niche);
  } catch (err) {
    console.error('Error fetching niche:', err);
    return failure('Failed to fetch niche', 500);
  }
};

/**
 * PUT /api/niches/[id] - Update a niche
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Niche>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db.select().from(niches).where(eq(niches.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Niche not found', 404);
    }

    const updateData: Partial<Niche> = {
      ...body,
      updatedAt: now()
    };
    // Arrays must be JSON-serialized for SQLite TEXT fields
    if (body.keywords !== undefined) {
      (updateData as any).keywords = body.keywords ? JSON.stringify(body.keywords) : null;
    }
    if (body.bookIdeas !== undefined) {
      (updateData as any).bookIdeas = body.bookIdeas ? JSON.stringify(body.bookIdeas) : null;
    }
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(niches).set(updateData).where(eq(niches.id, params.id));

    const updated = await db.select().from(niches).where(eq(niches.id, params.id)).limit(1);

    // Parse JSON arrays from TEXT fields
    const niche = {
      ...updated[0],
      keywords: updated[0].keywords ? JSON.parse(updated[0].keywords) : null,
      bookIdeas: updated[0].bookIdeas ? JSON.parse(updated[0].bookIdeas) : null
    };

    return success(niche);
  } catch (err) {
    console.error('Error updating niche:', err);
    return failure('Failed to update niche', 500);
  }
};

/**
 * DELETE /api/niches/[id] - Delete a niche
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const existing = await db.select().from(niches).where(eq(niches.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Niche not found', 404);
    }

    await db.delete(niches).where(eq(niches.id, params.id));

    return success({ deleted: true, id: params.id });
  } catch (err) {
    console.error('Error deleting niche:', err);
    return failure('Failed to delete niche', 500);
  }
};
