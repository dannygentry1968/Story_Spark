import type { RequestHandler } from './$types';
import { getDb, niches } from '$lib/db';
import { desc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired, getPagination } from '$lib/api/utils';
import type { NewNiche } from '$lib/db/schema';

/**
 * GET /api/niches - List all niches
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const { limit, offset } = getPagination(url);

    const allNiches = await db
      .select()
      .from(niches)
      .orderBy(desc(niches.updatedAt))
      .limit(limit)
      .offset(offset);

    // Parse JSON arrays from TEXT fields
    const parsed = allNiches.map(n => ({
      ...n,
      keywords: n.keywords ? JSON.parse(n.keywords) : null,
      bookIdeas: n.bookIdeas ? JSON.parse(n.bookIdeas) : null
    }));

    return success(parsed);
  } catch (err) {
    console.error('Error fetching niches:', err);
    return failure('Failed to fetch niches', 500);
  }
};

/**
 * POST /api/niches - Create a new niche
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Partial<NewNiche>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['name']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();
    const id = generateId();
    const timestamp = now();

    const newNiche: NewNiche = {
      id,
      name: body.name!,
      category: body.category || null,
      // Arrays must be JSON-serialized for SQLite TEXT fields
      keywords: body.keywords ? JSON.stringify(body.keywords) : null,
      competitionLevel: body.competitionLevel || null,
      demandLevel: body.demandLevel || null,
      notes: body.notes || null,
      bookIdeas: body.bookIdeas ? JSON.stringify(body.bookIdeas) : null,
      researched: body.researched || false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(niches).values(newNiche);

    return success(newNiche, 201);
  } catch (err) {
    console.error('Error creating niche:', err);
    return failure('Failed to create niche', 500);
  }
};
