import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * GET /api/health - Health check endpoint for Docker/load balancers
 */
export const GET: RequestHandler = async () => {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '3.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    return json(health, { status: 200 });
  } catch (err) {
    return json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
};
