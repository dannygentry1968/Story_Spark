import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { exports as exportsTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * GET /api/export/[id] - Get export status
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const [exportRecord] = await db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.id, id));

    if (!exportRecord) {
      return json({ error: 'Export not found' }, { status: 404 });
    }

    return json({
      id: exportRecord.id,
      bookId: exportRecord.bookId,
      status: exportRecord.status,
      format: exportRecord.format,
      filePath: exportRecord.filePath,
      createdAt: exportRecord.createdAt,
      completedAt: exportRecord.completedAt,
      downloadUrl: exportRecord.status === 'completed' ? `/api/export/${id}/download` : null
    });
  } catch (err) {
    console.error('Failed to get export status:', err);
    return json({ error: 'Failed to get export status' }, { status: 500 });
  }
};

/**
 * DELETE /api/export/[id] - Delete an export
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const [exportRecord] = await db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.id, id));

    if (!exportRecord) {
      return json({ error: 'Export not found' }, { status: 404 });
    }

    // Delete the file if it exists
    if (exportRecord.filePath) {
      try {
        await fs.unlink(exportRecord.filePath);
      } catch (err) {
        // File might not exist
      }
    }

    // Delete the record
    await db.delete(exportsTable).where(eq(exportsTable.id, id));

    return json({ success: true });
  } catch (err) {
    console.error('Failed to delete export:', err);
    return json({ error: 'Failed to delete export' }, { status: 500 });
  }
};
