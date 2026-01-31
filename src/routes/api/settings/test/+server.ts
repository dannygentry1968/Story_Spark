import type { RequestHandler } from './$types';
import { success, failure, parseBody } from '$lib/api/utils';

/**
 * POST /api/settings/test - Test API key connections
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<{ type: 'anthropic' | 'openai'; apiKey: string }>(request);
    if (!body || !body.type || !body.apiKey) {
      return failure('Invalid request - type and apiKey required');
    }

    const { type, apiKey } = body;

    if (type === 'anthropic') {
      // Test Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (response.ok) {
        return success({ success: true, message: 'Claude API connection successful!' });
      } else {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return success({
          success: false,
          message: `Claude API error: ${error.error?.message || response.statusText}`
        });
      }
    } else if (type === 'openai') {
      // Test OpenAI API
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return success({ success: true, message: 'OpenAI API connection successful!' });
      } else {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return success({
          success: false,
          message: `OpenAI API error: ${error.error?.message || response.statusText}`
        });
      }
    }

    return failure(`Unknown API type: ${type}`);
  } catch (err) {
    console.error('Error testing API:', err);
    const message = err instanceof Error ? err.message : 'Failed to test API';
    return failure(message, 500);
  }
};
