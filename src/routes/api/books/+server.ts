import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, books } from '$lib/db';
import { eq, desc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired, getPagination } from '$lib/api/utils';
import type { NewBook } from '$lib/db/schema';

/**
 * GET /api/books - List all books with pagination
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const { limit, offset } = getPagination(url);
    const status = url.searchParams.get('status');
    const seriesId = url.searchParams.get('seriesId');

    let query = db.select().from(books).orderBy(desc(books.updatedAt));

    // Note: Drizzle doesn't chain where clauses easily, so we'll filter in memory for now
    // In production, you'd use proper query building
    const allBooks = await query.limit(limit).offset(offset);

    let filtered = allBooks;
    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }
    if (seriesId) {
      filtered = filtered.filter(b => b.seriesId === seriesId);
    }

    return success(filtered);
  } catch (err) {
    console.error('Error fetching books:', err);
    return failure('Failed to fetch books', 500);
  }
};

/**
 * POST /api/books - Create a new book
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Partial<NewBook>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['title', 'bookType', 'targetAge']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();
    const id = generateId();
    const timestamp = now();

    const newBook: NewBook = {
      id,
      title: body.title!,
      subtitle: body.subtitle || null,
      bookType: body.bookType!,
      targetAge: body.targetAge!,
      seriesId: body.seriesId || null,
      concept: body.concept || null,
      outline: body.outline || null,
      manuscript: body.manuscript || null,
      trimSize: body.trimSize || '8.5x8.5',
      pageCount: body.pageCount || null,
      interiorType: body.interiorType || 'color',
      status: 'draft',
      currentStep: 1,
      asin: null,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(books).values(newBook);

    return success(newBook, 201);
  } catch (err) {
    console.error('Error creating book:', err);
    return failure('Failed to create book', 500);
  }
};
