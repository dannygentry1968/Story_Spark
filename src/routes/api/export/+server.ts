import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { books, pages, exports as exportsTable } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  TRIM_SIZES,
  calculateSpineWidth,
  calculateCoverDimensions,
  getRecommendedSettings,
  validateExportConfig
} from '$lib/services/pdf-export';

// Export directory
const EXPORT_DIR = process.env.EXPORT_DIR || './exports';

// Ensure export directory exists
async function ensureExportDir() {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

/**
 * GET /api/export - List exports for a book
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const bookId = url.searchParams.get('bookId');

    if (!bookId) {
      return json({ error: 'Book ID required' }, { status: 400 });
    }

    const exportsList = await db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.bookId, bookId))
      .orderBy(desc(exportsTable.createdAt));

    return json(exportsList);
  } catch (err) {
    console.error('Failed to list exports:', err);
    return json({ error: 'Failed to list exports' }, { status: 500 });
  }
};

/**
 * POST /api/export - Create a new export job
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      bookId,
      type = 'interior', // 'interior', 'cover', 'complete'
      trimSize,
      paperType = 'white',
      includeBleed = true,
      colorMode = 'color'
    } = body;

    // Validate required fields
    if (!bookId) {
      return json({ error: 'Book ID required' }, { status: 400 });
    }

    // Get book data
    const [book] = await db.select().from(books).where(eq(books.id, bookId));
    if (!book) {
      return json({ error: 'Book not found' }, { status: 404 });
    }

    // Get book pages
    const bookPages = await db
      .select()
      .from(pages)
      .where(eq(pages.bookId, bookId))
      .orderBy(pages.pageNumber);

    // Use provided trim size or book's default
    const finalTrimSize = trimSize || book.trimSize || '8.5x8.5';

    // Validate configuration
    const validation = validateExportConfig({
      bookId,
      trimSize: finalTrimSize,
      paperType,
      includeBleed,
      colorMode
    });

    if (!validation.valid) {
      return json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Create export record
    const exportId = randomUUID();
    const timestamp = Date.now();

    await ensureExportDir();

    // Prepare export data
    let exportConfig: any;
    let outputFilename: string;

    if (type === 'interior' || type === 'complete') {
      // Interior PDF config
      outputFilename = `${book.title.replace(/[^a-z0-9]/gi, '_')}_interior_${timestamp}.pdf`;

      exportConfig = {
        type: 'interior',
        output_path: path.join(EXPORT_DIR, outputFilename),
        trim_size: finalTrimSize,
        include_bleed: includeBleed,
        pages: bookPages.map(p => ({
          page_number: p.pageNumber,
          text: p.text || '',
          illustration_path: p.illustrationPath || '',
          layout: p.layout || 'text-bottom'
        }))
      };
    } else if (type === 'cover') {
      // Cover PDF config
      outputFilename = `${book.title.replace(/[^a-z0-9]/gi, '_')}_cover_${timestamp}.pdf`;

      const spineWidth = calculateSpineWidth(book.pageCount || 24, paperType);

      exportConfig = {
        type: 'cover',
        output_path: path.join(EXPORT_DIR, outputFilename),
        trim_size: finalTrimSize,
        page_count: book.pageCount || 24,
        paper_type: paperType,
        include_bleed: includeBleed,
        front_image: book.coverPath || '',
        back_image: '',
        spine_text: book.title,
        title: book.title,
        author: 'StorySpark Author', // TODO: Get from settings
        background_color: '#FFFFFF'
      };
    } else {
      return json({ error: `Invalid export type: ${type}` }, { status: 400 });
    }

    // Create export record in pending state
    const [exportRecord] = await db.insert(exportsTable).values({
      id: exportId,
      bookId,
      format: 'pdf',
      status: 'pending',
      settings: exportConfig
    }).returning();

    // Start async PDF generation
    generatePdfAsync(exportId, exportConfig);

    return json({
      id: exportId,
      status: 'pending',
      message: 'Export job started',
      estimatedTime: '10-30 seconds'
    });
  } catch (err) {
    console.error('Failed to create export:', err);
    return json({ error: 'Failed to create export' }, { status: 500 });
  }
};

/**
 * Generate PDF asynchronously using Python script
 */
async function generatePdfAsync(exportId: string, config: any) {
  try {
    // Update status to processing
    await db
      .update(exportsTable)
      .set({ status: 'processing' })
      .where(eq(exportsTable.id, exportId));

    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_pdf.py');

    // Run Python script
    const result = await new Promise<string>((resolve, reject) => {
      const configJson = JSON.stringify(config);

      const proc = spawn('python3', [scriptPath, configJson], {
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    // Parse result
    const lines = result.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    let outputPath = config.output_path;
    try {
      const parsed = JSON.parse(lastLine);
      if (parsed.output_path) {
        outputPath = parsed.output_path;
      }
    } catch {
      // Use default output path
    }

    // Update export record as completed
    await db
      .update(exportsTable)
      .set({
        status: 'completed',
        filePath: outputPath,
        completedAt: new Date()
      })
      .where(eq(exportsTable.id, exportId));

    console.log(`Export ${exportId} completed: ${outputPath}`);
  } catch (err) {
    console.error(`Export ${exportId} failed:`, err);

    // Update export record as failed
    await db
      .update(exportsTable)
      .set({
        status: 'failed',
        completedAt: new Date()
      })
      .where(eq(exportsTable.id, exportId));
  }
}
