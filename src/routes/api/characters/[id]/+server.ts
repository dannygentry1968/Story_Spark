import type { RequestHandler } from './$types';
import { getDb, characters } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Character } from '$lib/db/schema';

/**
 * GET /api/characters/[id] - Get a single character
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();
    const result = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);

    if (result.length === 0) {
      return failure('Character not found', 404);
    }

    return success(result[0]);
  } catch (err) {
    console.error('Error fetching character:', err);
    return failure('Failed to fetch character', 500);
  }
};

/**
 * PUT /api/characters/[id] - Update a character
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Character>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Character not found', 404);
    }

    const updateData: Partial<Character> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(characters).set(updateData).where(eq(characters.id, params.id));

    const updated = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating character:', err);
    return failure('Failed to update character', 500);
  }
};

/**
 * DELETE /api/characters/[id] - Delete a character
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const existing = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Character not found', 404);
    }

    await db.delete(characters).where(eq(characters.id, params.id));

    return success({ deleted: true, id: params.id });
  } catch (err) {
    console.error('Error deleting character:', err);
    return failure('Failed to delete character', 500);
  }
};

/**
 * PATCH /api/characters/[id] - Partial update
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Character>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Character not found', 404);
    }

    const updateData: Partial<Character> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(characters).set(updateData).where(eq(characters.id, params.id));

    const updated = await db.select().from(characters).where(eq(characters.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating character:', err);
    return failure('Failed to update character', 500);
  }
};
