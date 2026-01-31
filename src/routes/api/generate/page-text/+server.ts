import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generatePageText, type PageTextRequest } from '$lib/services/claude';

/**
 * POST /api/generate/page-text - Generate text for a single page
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<PageTextRequest>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'bookType',
      'targetAge',
      'storyContext',
      'pageNumber',
      'pageSummary'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    const text = await generatePageText(body);

    return success({ text }, 201);
  } catch (err) {
    console.error('Error generating page text:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate page text';
    return failure(message, 500);
  }
};
