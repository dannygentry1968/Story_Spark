import type { RequestHandler } from './$types';
import { getDb, listings } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Listing } from '$lib/db/schema';

/**
 * GET /api/listings/[id] - Get a single listing
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();
    const result = await db.select().from(listings).where(eq(listings.id, params.id)).limit(1);

    if (result.length === 0) {
      return failure('Listing not found', 404);
    }

    return success(result[0]);
  } catch (err) {
    console.error('Error fetching listing:', err);
    return failure('Failed to fetch listing', 500);
  }
};

/**
 * PUT /api/listings/[id] - Update a listing
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Listing>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db.select().from(listings).where(eq(listings.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Listing not found', 404);
    }

    const updateData: Partial<Listing> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).bookId;
    delete (updateData as any).createdAt;

    await db.update(listings).set(updateData).where(eq(listings.id, params.id));

    const updated = await db.select().from(listings).where(eq(listings.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating listing:', err);
    return failure('Failed to update listing', 500);
  }
};

/**
 * DELETE /api/listings/[id] - Delete a listing
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const existing = await db.select().from(listings).where(eq(listings.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Listing not found', 404);
    }

    await db.delete(listings).where(eq(listings.id, params.id));

    return success({ deleted: true, id: params.id });
  } catch (err) {
    console.error('Error deleting listing:', err);
    return failure('Failed to delete listing', 500);
  }
};
