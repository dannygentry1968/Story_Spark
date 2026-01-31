import type { RequestHandler } from './$types';
import { getDb, books, series, characters, niches } from '$lib/db';
import { eq, desc, gte, count } from 'drizzle-orm';
import { success, failure } from '$lib/api/utils';

/**
 * GET /api/stats - Get dashboard statistics
 */
export const GET: RequestHandler = async () => {
  try {
    const db = getDb();

    // Get all books for counting
    const allBooks = await db.select().from(books);

    // Calculate stats
    const totalBooks = allBooks.length;
    const inProgress = allBooks.filter(b =>
      ['draft', 'writing', 'illustrating', 'review'].includes(b.status || '')
    ).length;
    const published = allBooks.filter(b => b.status === 'published').length;
    const exported = allBooks.filter(b => b.status === 'exported').length;

    // This month's books
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthBooks = allBooks.filter(b =>
      b.createdAt && new Date(b.createdAt) >= thisMonth
    ).length;

    // Get recent books
    const recentBooks = await db
      .select()
      .from(books)
      .orderBy(desc(books.updatedAt))
      .limit(5);

    // Count other entities
    const allSeries = await db.select().from(series);
    const allCharacters = await db.select().from(characters);
    const allNiches = await db.select().from(niches);

    return success({
      counts: {
        totalBooks,
        inProgress,
        published,
        exported,
        thisMonth: thisMonthBooks,
        series: allSeries.length,
        characters: allCharacters.length,
        niches: allNiches.length
      },
      recentBooks: recentBooks.map(b => ({
        id: b.id,
        title: b.title,
        bookType: b.bookType,
        status: b.status,
        updatedAt: b.updatedAt
      }))
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return failure('Failed to fetch stats', 500);
  }
};
