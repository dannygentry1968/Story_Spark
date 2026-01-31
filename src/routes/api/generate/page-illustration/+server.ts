import type { RequestHandler } from './$types';
import { success, failure, parseBody, validateRequired, now } from '$lib/api/utils';
import { generatePageIllustration, type PageIllustrationRequest, getStylePrompt, type IllustrationStyle } from '$lib/services/openai';
import { getDb, pages } from '$lib/db';
import { eq, and } from 'drizzle-orm';

interface RequestBody {
  bookId: string;
  pageId?: string;
  pageNumber: number;
  prompt: string;
  style: IllustrationStyle | string;
  characterReferences?: {
    name: string;
    imagePath: string;
  }[];
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

/**
 * POST /api/generate/page-illustration - Generate illustration for a book page
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<RequestBody>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const validationError = validateRequired(body as Record<string, unknown>, [
      'bookId',
      'pageNumber',
      'prompt',
      'style'
    ]);
    if (validationError) {
      return failure(validationError);
    }

    // Expand style if it's a preset
    const stylePrompt = typeof body.style === 'string' && body.style in getStylePrompt
      ? getStylePrompt(body.style as IllustrationStyle)
      : body.style;

    console.log(`Generating illustration for book ${body.bookId}, page ${body.pageNumber}`);

    const result = await generatePageIllustration({
      bookId: body.bookId,
      pageNumber: body.pageNumber,
      prompt: body.prompt,
      style: stylePrompt,
      characterReferences: body.characterReferences,
      size: body.size
    });

    // Update page record with illustration path if pageId provided
    if (body.pageId) {
      const db = getDb();
      await db
        .update(pages)
        .set({
          illustrationPath: result.localPath,
          illustrationPrompt: result.revisedPrompt || body.prompt,
          illustrationStyle: body.style,
          updatedAt: now()
        })
        .where(eq(pages.id, body.pageId));
    }

    return success(result, 201);
  } catch (err) {
    console.error('Error generating page illustration:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate illustration';
    return failure(message, 500);
  }
};
