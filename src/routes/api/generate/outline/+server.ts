import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generateOutline, type OutlineRequest } from '$lib/services/claude';

/**
 * POST /api/generate/outline - Generate a story outline
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<OutlineRequest>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'bookType',
      'targetAge',
      'concept'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    console.log('Generating outline for:', body.concept);

    const outline = await generateOutline(body);

    return success(outline, 201);
  } catch (err) {
    console.error('Error generating outline:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate outline';
    return failure(message, 500);
  }
};
