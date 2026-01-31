import type { RequestHandler } from './$types';
import { getDb, characters } from '$lib/db';
import { eq, desc } from 'drizzle-orm';
import { success, failure, parseBody, generateId, now, validateRequired, getPagination } from '$lib/api/utils';
import type { NewCharacter } from '$lib/db/schema';

/**
 * GET /api/characters - List all characters
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const { limit, offset } = getPagination(url);
    const seriesId = url.searchParams.get('seriesId');

    let allCharacters = await db
      .select()
      .from(characters)
      .orderBy(desc(characters.updatedAt))
      .limit(limit)
      .offset(offset);

    if (seriesId) {
      allCharacters = allCharacters.filter(c => c.seriesId === seriesId);
    }

    return success(allCharacters);
  } catch (err) {
    console.error('Error fetching characters:', err);
    return failure('Failed to fetch characters', 500);
  }
};

/**
 * POST /api/characters - Create a new character
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Partial<NewCharacter>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['name', 'description', 'visualDescription']);
    if (validationError) {
      return failure(validationError);
    }

    const db = getDb();
    const id = generateId();
    const timestamp = now();

    const newCharacter: NewCharacter = {
      id,
      seriesId: body.seriesId || null,
      name: body.name!,
      description: body.description!,
      visualDescription: body.visualDescription!,
      personality: body.personality || null,
      role: body.role || null,
      referenceImagePath: body.referenceImagePath || null,
      referenceImagePrompt: body.referenceImagePrompt || null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.insert(characters).values(newCharacter);

    return success(newCharacter, 201);
  } catch (err) {
    console.error('Error creating character:', err);
    return failure('Failed to create character', 500);
  }
};
