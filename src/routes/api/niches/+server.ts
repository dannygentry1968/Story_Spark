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

    return success(allNiches);
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
      keywords: body.keywords || null,
      competitionLevel: body.competitionLevel || null,
      demandLevel: body.demandLevel || null,
      notes: body.notes || null,
      bookIdeas: body.bookIdeas || null,
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
