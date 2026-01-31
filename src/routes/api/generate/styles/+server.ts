import type { RequestHandler } from './$types';
import { success } from '$lib/api/utils';
import { ILLUSTRATION_STYLES } from '$lib/services/openai';

/**
 * GET /api/generate/styles - Get available illustration styles
 */
export const GET: RequestHandler = async () => {
  const styles = Object.entries(ILLUSTRATION_STYLES).map(([id, description]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    description
  }));

  return success(styles);
};
