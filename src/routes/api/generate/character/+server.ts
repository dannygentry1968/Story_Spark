import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generateCharacter, type CharacterRequest } from '$lib/services/claude';

/**
 * POST /api/generate/character - Generate a detailed character profile
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<CharacterRequest>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'name',
      'basicDescription',
      'bookType',
      'targetAge'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    const character = await generateCharacter(body);

    return success(character, 201);
  } catch (err) {
    console.error('Error generating character:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate character';
    return failure(message, 500);
  }
};
