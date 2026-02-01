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

    // Parse JSON arrays from TEXT fields
    const listing = {
      ...result[0],
      keywords: result[0].keywords ? JSON.parse(result[0].keywords) : null,
      categories: result[0].categories ? JSON.parse(result[0].categories) : null
    };

    return success(listing);
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
    // Arrays must be JSON-serialized for SQLite TEXT fields
    if (body.keywords !== undefined) {
      (updateData as any).keywords = body.keywords ? JSON.stringify(body.keywords) : null;
    }
    if (body.categories !== undefined) {
      (updateData as any).categories = body.categories ? JSON.stringify(body.categories) : null;
    }
    delete (updateData as any).id;
    delete (updateData as any).bookId;
    delete (updateData as any).createdAt;

    await db.update(listings).set(updateData).where(eq(listings.id, params.id));

    const updated = await db.select().from(listings).where(eq(listings.id, params.id)).limit(1);

    // Parse JSON arrays from TEXT fields
    const listing = {
      ...updated[0],
      keywords: updated[0].keywords ? JSON.parse(updated[0].keywords) : null,
      categories: updated[0].categories ? JSON.parse(updated[0].categories) : null
    };

    return success(listing);
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
