import type { RequestHandler } from './$types';
import { getDb, books, pages } from '$lib/db';
import { eq, asc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired } from '$lib/api/utils';
import type { NewPage } from '$lib/db/schema';

/**
 * GET /api/books/[id]/pages - Get all pages for a book
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const db = getDb();

    // Verify book exists
    const book = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (book.length === 0) {
      return failure('Book not found', 404);
    }

    const bookPages = await db
      .select()
      .from(pages)
      .where(eq(pages.bookId, params.id))
      .orderBy(asc(pages.pageNumber));

    return success(bookPages);
  } catch (err) {
    console.error('Error fetching pages:', err);
    return failure('Failed to fetch pages', 500);
  }
};

/**
 * POST /api/books/[id]/pages - Create a new page
 */
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<Partial<NewPage>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['pageNumber']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();

    // Verify book exists
    const book = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (book.length === 0) {
      return failure('Book not found', 404);
    }

    const id = generateId();
    const timestamp = now();

    const newPage: NewPage = {
      id,
      bookId: params.id,
      pageNumber: body.pageNumber!,
      pageType: body.pageType || 'content',
      text: body.text || null,
      textFormatted: body.textFormatted || null,
      illustrationPrompt: body.illustrationPrompt || null,
      illustrationPath: body.illustrationPath || null,
      illustrationStyle: body.illustrationStyle || null,
      layout: body.layout || 'text_bottom',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(pages).values(newPage);

    return success(newPage, 201);
  } catch (err) {
    console.error('Error creating page:', err);
    return failure('Failed to create page', 500);
  }
};

/**
 * PUT /api/books/[id]/pages - Bulk update/replace all pages
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await parseBody<{ pages: Partial<NewPage>[] }>(request);
    if (!body || !Array.isArray(body.pages)) {
      return failure('Invalid JSON body - expected { pages: [...] }');
    }

    const db = getDb();

    // Verify book exists
    const book = await db.select().from(books).where(eq(books.id, params.id)).limit(1);
    if (book.length === 0) {
      return failure('Book not found', 404);
    }

    // Delete existing pages
    await db.delete(pages).where(eq(pages.bookId, params.id));

    // Insert new pages
    const timestamp = now();
    const newPages: NewPage[] = body.pages.map((p, index) => ({
      id: generateId(),
      bookId: params.id,
      pageNumber: p.pageNumber ?? index + 1,
      pageType: p.pageType || 'content',
      text: p.text || null,
      textFormatted: p.textFormatted || null,
      illustrationPrompt: p.illustrationPrompt || null,
      illustrationPath: p.illustrationPath || null,
      illustrationStyle: p.illustrationStyle || null,
      layout: p.layout || 'text_bottom',
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    if (newPages.length > 0) {
      await db.insert(pages).values(newPages);
    }

    // Update book page count
    await db.update(books).set({ pageCount: newPages.length, updatedAt: timestamp }).where(eq(books.id, params.id));

    return success(newPages);
  } catch (err) {
    console.error('Error updating pages:', err);
    return failure('Failed to update pages', 500);
  }
};
