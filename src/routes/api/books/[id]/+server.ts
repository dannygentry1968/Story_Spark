import type { RequestHandler } from './$types';
import { getDb, books } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { Book } from '$lib/db/schema';

/**
 * GET /api/books/[id] - Get a single book by ID
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();
    const result = await db.select().from(books).where(eq(books.id, params.id)).limit(1);

    if (result.length === 0) {
      return failure('Book not found', 404);
    }

    return success(result[0]);
  } catch (err) {
    console.error('Error fetching book:', err);
    return failure('Failed to fetch book', 500);
  }
};

/**
 * PUT /api/books/[id] - Update a book
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Book>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    // Check if book exists
    const existing = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Book not found', 404);
    }

    // Build update object (exclude id, createdAt)
    const updateData: Partial<Book> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(books).set(updateData).where(eq(books.id, params.id));

    // Fetch updated book
    const updated = await db.select().from(books).where(eq(books.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    return failure('Failed to update book', 500);
  }
};

/**
 * DELETE /api/books/[id] - Delete a book
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    // Check if book exists
    const existing = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Book not found', 404);
    }

    await db.delete(books).where(eq(books.id, params.id));

    return success({ deleted: true, id: params.id });
  } catch (err) {
    console.error('Error deleting book:', err);
    return failure('Failed to delete book', 500);
  }
};

/**
 * PATCH /api/books/[id] - Partial update (useful for status changes)
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<Book>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();

    // Check if book exists
    const existing = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (existing.length === 0) {
      return failure('Book not found', 404);
    }

    // Only update provided fields
    const updateData: Partial<Book> = {
      ...body,
      updatedAt: now()
    };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await db.update(books).set(updateData).where(eq(books.id, params.id));

    const updated = await db.select().from(books).where(eq(books.id, params.id)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    return failure('Failed to update book', 500);
  }
};
