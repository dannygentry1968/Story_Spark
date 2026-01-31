import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generateCoverArt, type CoverRequest, getStylePrompt, type IllustrationStyle } from '$lib/services/openai';

interface RequestBody extends Omit<CoverRequest, 'style'> {
  style: IllustrationStyle | string;
}

/**
 * POST /api/generate/cover - Generate book cover art
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<RequestBody>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'bookId',
      'title',
      'style'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    // Expand style if it's a preset
    const stylePrompt = typeof body.style === 'string' && body.style in getStylePrompt
      ? getStylePrompt(body.style as IllustrationStyle)
      : body.style;

    console.log('Generating cover art for:', body.title);

    const result = await generateCoverArt({
      ...body,
      style: stylePrompt
    });

    return success(result, 201);
  } catch (err) {
    console.error('Error generating cover:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate cover';
    return failure(message, 500);
  }
};
