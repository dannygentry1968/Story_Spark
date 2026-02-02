import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';
import { exports as exportsTable, books } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * GET /api/export/[id]/download - Download export file
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Get export record
    const [exportRecord] = await getDb()
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.id, id));

    if (!exportRecord) {
      return new Response('Export not found', { status: 404 });
    }

    if (exportRecord.status !== 'completed') {
      return new Response('Export not ready', { status: 400 });
    }

    if (!exportRecord.filePath) {
      return new Response('Export file not found', { status: 404 });
    }

    // Read the file
    let fileData: Buffer;
    try {
      fileData = await fs.readFile(exportRecord.filePath);
    } catch (err) {
      console.error('Failed to read export file:', err);
      return new Response('Export file not found', { status: 404 });
    }

    // Get book name for filename
    const [book] = await getDb()
      .select()
      .from(books)
      .where(eq(books.id, exportRecord.bookId));

    const bookName = book?.title || 'StorySpark_Book';
    const safeName = bookName.replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeName}_${exportRecord.format}.pdf`;

    // Return file as download
    return new Response(fileData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileData.length.toString()
      }
    });
  } catch (err) {
    console.error('Failed to download export:', err);
    return new Response('Failed to download export', { status: 500 });
  }
};
