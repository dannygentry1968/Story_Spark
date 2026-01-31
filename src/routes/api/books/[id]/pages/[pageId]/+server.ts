import type { RequestHandler } from './$types';
import { getDb, pages } from '$lib/db';
import { eq, and } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Page } from '$lib/db/schema';

/**
 * GET /api/books/[id]/pages/[pageId] - Get a single page
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const result = await db
      .select()
      .from(pages)
      .where(and(eq(pages.bookId, params.id), eq(pages.id, params.pageId)))
      .limit(1);

    if (result.length === 0) {
      return failure('Page not found', 404);
    }

    return success(result[0]);
  } catch (err) {
    console.error('Error fetching page:', err);
    return failure('Failed to fetch page', 500);
  }
};

/**
 * PUT /api/books/[id]/pages/[pageId] - Update a page
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Page>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    const existing = await db
      .select()
      .from(pages)
      .where(and(eq(pages.bookId, params.id), eq(pages.id, params.pageId)))
      .limit(1);

    if (existing.length === 0) {
      return failure('Page not found', 404);
    }

    const updateData: Partial<Page> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).bookId;
    delete (updateData as any).createdAt;

    await db.update(pages).set(updateData).where(eq(pages.id, params.pageId));

    const updated = await db.select().from(pages).where(eq(pages.id, params.pageId)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating page:', err);
    return failure('Failed to update page', 500);
  }
};

/**
 * DELETE /api/books/[id]/pages/[pageId] - Delete a page
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    const existing = await db
      .select()
      .from(pages)
      .where(and(eq(pages.bookId, params.id), eq(pages.id, params.pageId)))
      .limit(1);

    if (existing.length === 0) {
      return failure('Page not found', 404);
    }

    await db.delete(pages).where(eq(pages.id, params.pageId));

    return success({ deleted: true, id: params.pageId });
  } catch (err) {
    console.error('Error deleting page:', err);
    return failure('Failed to delete page', 500);
  }
};
