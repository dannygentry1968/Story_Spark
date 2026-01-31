import type { RequestHandler } from './$types';
import { getDb, books, series, characters, niches, pages, exports } from '$lib/db';
import { eq, desc, gte, count, sql } from 'drizzle-orm';
import { success, failure } from '$lib/api/utils';

/**
 * GET /api/stats - Get dashboard statistics with detailed analytics
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
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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

    // ========== ANALYTICS DATA ==========

    // Books by status (pipeline)
    const booksByStatus = {
      draft: allBooks.filter(b => b.status === 'draft').length,
      writing: allBooks.filter(b => b.status === 'writing').length,
      illustrating: allBooks.filter(b => b.status === 'illustrating').length,
      review: allBooks.filter(b => b.status === 'review').length,
      exported: allBooks.filter(b => b.status === 'exported').length,
      published: allBooks.filter(b => b.status === 'published').length
    };

    // Books by type
    const booksByType = {
      picture: allBooks.filter(b => b.bookType === 'picture').length,
      board: allBooks.filter(b => b.bookType === 'board').length,
      early_reader: allBooks.filter(b => b.bookType === 'early_reader').length,
      activity: allBooks.filter(b => b.bookType === 'activity').length,
      coloring: allBooks.filter(b => b.bookType === 'coloring').length
    };

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const created = allBooks.filter(b => {
        const createdAt = b.createdAt ? new Date(b.createdAt) : null;
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const completedCount = allBooks.filter(b => {
        const updatedAt = b.updatedAt ? new Date(b.updatedAt) : null;
        return updatedAt &&
          updatedAt >= monthStart &&
          updatedAt <= monthEnd &&
          (b.status === 'exported' || b.status === 'published');
      }).length;

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        year: monthStart.getFullYear(),
        created,
        completed: completedCount
      });
    }

    // Recent activity feed
    const recentActivity = [];

    // Add recent book activities
    for (const book of allBooks.slice(0, 20)) {
      if (book.createdAt) {
        recentActivity.push({
          id: `book-created-${book.id}`,
          type: 'book_created',
          entityId: book.id,
          entityName: book.title,
          entityType: 'book',
          timestamp: book.createdAt,
          description: `Created new ${book.bookType || 'book'}: "${book.title}"`
        });
      }
      if (book.status === 'published' && book.updatedAt) {
        recentActivity.push({
          id: `book-published-${book.id}`,
          type: 'book_published',
          entityId: book.id,
          entityName: book.title,
          entityType: 'book',
          timestamp: book.updatedAt,
          description: `Published "${book.title}"`
        });
      }
      if (book.status === 'exported' && book.updatedAt) {
        recentActivity.push({
          id: `book-exported-${book.id}`,
          type: 'book_exported',
          entityId: book.id,
          entityName: book.title,
          entityType: 'book',
          timestamp: book.updatedAt,
          description: `Exported "${book.title}" for KDP`
        });
      }
    }

    // Add character activities
    for (const character of allCharacters.slice(0, 10)) {
      if (character.createdAt) {
        recentActivity.push({
          id: `char-created-${character.id}`,
          type: 'character_created',
          entityId: character.id,
          entityName: character.name,
          entityType: 'character',
          timestamp: character.createdAt,
          description: `Created character: ${character.name}`
        });
      }
      if (character.referenceImagePath && character.updatedAt) {
        recentActivity.push({
          id: `char-image-${character.id}`,
          type: 'character_image',
          entityId: character.id,
          entityName: character.name,
          entityType: 'character',
          timestamp: character.updatedAt,
          description: `Generated reference image for ${character.name}`
        });
      }
    }

    // Sort by timestamp and limit
    recentActivity.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });

    // Completion rate
    const completionRate = totalBooks > 0
      ? Math.round(((exported + published) / totalBooks) * 100)
      : 0;

    // Average time to completion (estimate based on created vs updated for completed books)
    const completedBooks = allBooks.filter(b =>
      b.status === 'exported' || b.status === 'published'
    );
    let avgDaysToComplete = 0;
    if (completedBooks.length > 0) {
      const totalDays = completedBooks.reduce((sum, b) => {
        if (b.createdAt && b.updatedAt) {
          const created = new Date(b.createdAt).getTime();
          const updated = new Date(b.updatedAt).getTime();
          return sum + Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
        }
        return sum;
      }, 0);
      avgDaysToComplete = Math.round(totalDays / completedBooks.length);
    }

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
      })),
      // New analytics data
      analytics: {
        booksByStatus,
        booksByType,
        monthlyTrends,
        completionRate,
        avgDaysToComplete
      },
      recentActivity: recentActivity.slice(0, 15)
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return failure('Failed to fetch stats', 500);
  }
};
