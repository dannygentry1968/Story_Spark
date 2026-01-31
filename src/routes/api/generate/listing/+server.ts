import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired } from '$lib/api/utils';
import { generateListing, type ListingRequest } from '$lib/services/claude';

/**
 * POST /api/generate/listing - Generate KDP listing content
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<ListingRequest>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'title',
      'bookType',
      'targetAge',
      'storySummary'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    const listing = await generateListing(body);

    return success(listing, 201);
  } catch (err) {
    console.error('Error generating listing:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate listing';
    return failure(message, 500);
  }
};
