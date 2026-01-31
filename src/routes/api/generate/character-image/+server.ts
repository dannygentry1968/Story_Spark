import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired, now } from '$lib/api/utils';
import { generateCharacterReference, type CharacterReferenceRequest, getStylePrompt, type IllustrationStyle } from '$lib/services/openai';
import { getDb, characters } from '$lib/db';
import { eq } from 'drizzle-orm';

interface RequestBody extends Omit<CharacterReferenceRequest, 'style'> {
  style: IllustrationStyle | string;
}

/**
 * POST /api/generate/character-image - Generate a character reference image
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<RequestBody>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'characterId',
      'name',
      'visualDescription',
      'style'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    // Expand style if it's a preset
    const stylePrompt = typeof body.style === 'string' && body.style in getStylePrompt
      ? getStylePrompt(body.style as IllustrationStyle)
      : body.style;

    console.log('Generating character reference for:', body.name);

    const result = await generateCharacterReference({
      ...body,
      style: stylePrompt
    });

    // Update character record with reference image path
    const db = getDb();
    await db
      .update(characters)
      .set({
        referenceImagePath: result.localPath,
        referenceImagePrompt: result.revisedPrompt || body.visualDescription,
        updatedAt: now()
      })
      .where(eq(characters.id, body.characterId));

    return success(result, 201);
  } catch (err) {
    console.error('Error generating character image:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate character image';
    return failure(message, 500);
  }
};
