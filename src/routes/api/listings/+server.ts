import type { RequestHandler } from './$types';
import { getDb, listings, books } from '$lib/db';
import { eq, desc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired, getPagination } from '$lib/api/utils';
import type { NewListing } from '$lib/db/schema';

/**
 * GET /api/listings - List all listings
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const { limit, offset } = getPagination(url);
    const bookId = url.searchParams.get('bookId');

    let allListings = await db
      .select()
      .from(listings)
      .orderBy(desc(listings.updatedAt))
      .limit(limit)
      .offset(offset);

    if (bookId) {
      allListings = allListings.filter(l => l.bookId === bookId);
    }

    // Parse JSON arrays from TEXT fields
    const parsed = allListings.map(l => ({
      ...l,
      keywords: l.keywords ? JSON.parse(l.keywords) : null,
      categories: l.categories ? JSON.parse(l.categories) : null
    }));

    return success(parsed);
  } catch (err) {
    console.error('Error fetching listings:', err);
    return failure('Failed to fetch listings', 500);
  }
};

/**
 * POST /api/listings - Create a new listing
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Partial<NewListing>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['bookId', 'title']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();

    // Verify book exists
    const book = await db.select().from(books).where(eq(books.id, body.bookId!)).limit(1);
    if (book.length === 0) {
      return failure('Book not found', 404);
    }

    const id = generateId();
    const timestamp = now();

    const newListing: NewListing = {
      id,
      bookId: body.bookId!,
      title: body.title!,
      subtitle: body.subtitle || null,
      description: body.description || null,
      // Arrays must be JSON-serialized for SQLite TEXT fields
      keywords: body.keywords ? JSON.stringify(body.keywords) : null,
      categories: body.categories ? JSON.stringify(body.categories) : null,
      backCoverText: body.backCoverText || null,
      listPrice: body.listPrice || null,
      currency: body.currency || 'USD',
      status: body.status || 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(listings).values(newListing);

    return success(newListing, 201);
  } catch (err) {
    console.error('Error creating listing:', err);
    return failure('Failed to create listing', 500);
  }
};
