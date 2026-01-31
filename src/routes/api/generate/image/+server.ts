import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generateImage, type ImageGenerationRequest } from '$lib/services/openai';

/**
 * POST /api/generate/image - Generate a general image
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<ImageGenerationRequest>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, ['prompt']);
    if (validationError) {
      return failure(validationError);
    }

    console.log('Generating image for prompt:', body.prompt.substring(0, 100) + '...');

    const result = await generateImage(body);

    return success(result, 201);
  } catch (err) {
    console.error('Error generating image:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate image';
    return failure(message, 500);
  }
};
