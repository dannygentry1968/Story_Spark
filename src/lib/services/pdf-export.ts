/**
 * PDF Export Service for StorySpark
 * Generates KDP-ready PDFs for children's books
 */

// KDP Trim Sizes (in inches)
export const TRIM_SIZES = {
  '8.5x8.5': { width: 8.5, height: 8.5, name: '8.5" x 8.5" Square' },
  '8x10': { width: 8, height: 10, name: '8" x 10" Portrait' },
  '8.5x11': { width: 8.5, height: 11, name: '8.5" x 11" Portrait' },
  '6x9': { width: 6, height: 9, name: '6" x 9" Standard' },
  '5.5x8.5': { width: 5.5, height: 8.5, name: '5.5" x 8.5" Digest' }
} as const;

// KDP Bleed and margin specifications
export const KDP_SPECS = {
  bleed: 0.125, // inches on each side
  safeMargin: 0.25, // inches from trim edge
  spineMarginMin: 0.375, // minimum gutter margin
  // Spine width calculation: pages * paper thickness
  spinePerPage: {
    white: 0.002252, // white paper
    cream: 0.0025 // cream paper
  }
};

export interface ExportConfig {
  bookId: string;
  trimSize: keyof typeof TRIM_SIZES;
  paperType: 'white' | 'cream';
  includeBleed: boolean;
  colorMode: 'color' | 'bw';
}

export interface CoverConfig extends ExportConfig {
  pageCount: number;
  frontCoverImage?: string;
  backCoverImage?: string;
  spineText?: string;
  barcode?: boolean;
}

export interface InteriorConfig extends ExportConfig {
  pages: Array<{
    pageNumber: number;
    text?: string;
    illustrationPath?: string;
    layout: 'full-bleed' | 'text-left' | 'text-right' | 'text-bottom' | 'text-only';
  }>;
}

/**
 * Calculate spine width based on page count and paper type
 */
export function calculateSpineWidth(pageCount: number, paperType: 'white' | 'cream'): number {
  return pageCount * KDP_SPECS.spinePerPage[paperType];
}

/**
 * Calculate full cover dimensions including spine and bleed
 */
export function calculateCoverDimensions(
  trimSize: keyof typeof TRIM_SIZES,
  pageCount: number,
  paperType: 'white' | 'cream',
  includeBleed: boolean
): { width: number; height: number; spineWidth: number } {
  const trim = TRIM_SIZES[trimSize];
  const spineWidth = calculateSpineWidth(pageCount, paperType);
  const bleed = includeBleed ? KDP_SPECS.bleed : 0;

  return {
    width: (trim.width * 2) + spineWidth + (bleed * 2),
    height: trim.height + (bleed * 2),
    spineWidth
  };
}

/**
 * Calculate interior page dimensions with optional bleed
 */
export function calculatePageDimensions(
  trimSize: keyof typeof TRIM_SIZES,
  includeBleed: boolean
): { width: number; height: number } {
  const trim = TRIM_SIZES[trimSize];
  const bleed = includeBleed ? KDP_SPECS.bleed : 0;

  return {
    width: trim.width + (bleed * 2),
    height: trim.height + (bleed * 2)
  };
}

/**
 * Convert inches to PDF points (72 points per inch)
 */
export function inchesToPoints(inches: number): number {
  return inches * 72;
}

/**
 * Generate Python script for interior PDF creation
 * This will be executed server-side
 */
export function generateInteriorScript(config: InteriorConfig): string {
  const trim = TRIM_SIZES[config.trimSize];
  const pageWidth = inchesToPoints(trim.width + (config.includeBleed ? KDP_SPECS.bleed * 2 : 0));
  const pageHeight = inchesToPoints(trim.height + (config.includeBleed ? KDP_SPECS.bleed * 2 : 0));
  const bleedPts = inchesToPoints(config.includeBleed ? KDP_SPECS.bleed : 0);
  const marginPts = inchesToPoints(KDP_SPECS.safeMargin);

  return `
#!/usr/bin/env python3
"""
StorySpark Interior PDF Generator
Book ID: ${config.bookId}
Trim Size: ${config.trimSize}
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image
import os

# Page dimensions
PAGE_WIDTH = ${pageWidth}
PAGE_HEIGHT = ${pageHeight}
BLEED = ${bleedPts}
MARGIN = ${marginPts}

# Safe area (where important content should be)
SAFE_LEFT = BLEED + MARGIN
SAFE_RIGHT = PAGE_WIDTH - BLEED - MARGIN
SAFE_TOP = PAGE_HEIGHT - BLEED - MARGIN
SAFE_BOTTOM = BLEED + MARGIN
SAFE_WIDTH = SAFE_RIGHT - SAFE_LEFT
SAFE_HEIGHT = SAFE_TOP - SAFE_BOTTOM

def create_interior_pdf(output_path, pages_data):
    """Create KDP-ready interior PDF"""
    c = canvas.Canvas(output_path, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    for page in pages_data:
        page_num = page.get('pageNumber', 1)
        text = page.get('text', '')
        illustration = page.get('illustrationPath', '')
        layout = page.get('layout', 'text-bottom')

        # Draw illustration if present
        if illustration and os.path.exists(illustration):
            if layout == 'full-bleed':
                # Full bleed: image fills entire page including bleed
                c.drawImage(illustration, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, preserveAspectRatio=True, anchor='c')
            else:
                # Image in safe area with space for text
                img_height = SAFE_HEIGHT * 0.7
                img_y = SAFE_BOTTOM + (SAFE_HEIGHT - img_height)
                c.drawImage(illustration, SAFE_LEFT, img_y, SAFE_WIDTH, img_height, preserveAspectRatio=True, anchor='c')

        # Draw text if present
        if text:
            c.setFont("Helvetica", 14)
            c.setFillColor(black)

            # Text positioning based on layout
            if layout == 'full-bleed' or layout == 'text-bottom':
                text_y = SAFE_BOTTOM + 20
            elif layout == 'text-left':
                text_y = SAFE_BOTTOM + SAFE_HEIGHT / 2
            else:
                text_y = SAFE_BOTTOM + SAFE_HEIGHT / 2

            # Wrap and draw text
            text_obj = c.beginText(SAFE_LEFT + 10, text_y)
            text_obj.setFont("Helvetica", 14)
            text_obj.setLeading(18)

            # Simple word wrapping
            words = text.split()
            line = ""
            max_width = SAFE_WIDTH - 20

            for word in words:
                test_line = line + " " + word if line else word
                if c.stringWidth(test_line, "Helvetica", 14) < max_width:
                    line = test_line
                else:
                    text_obj.textLine(line)
                    line = word

            if line:
                text_obj.textLine(line)

            c.drawText(text_obj)

        # Add page number (outside of very first and last page)
        if page_num > 1:
            c.setFont("Helvetica", 10)
            c.setFillColor(black)
            c.drawCentredString(PAGE_WIDTH / 2, BLEED + 15, str(page_num))

        c.showPage()

    c.save()
    return output_path

if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 3:
        print("Usage: python interior_generator.py <output_path> <pages_json>")
        sys.exit(1)

    output_path = sys.argv[1]
    pages_data = json.loads(sys.argv[2])

    result = create_interior_pdf(output_path, pages_data)
    print(f"Created: {result}")
`;
}

/**
 * Generate Python script for cover PDF creation
 */
export function generateCoverScript(config: CoverConfig): string {
  const dims = calculateCoverDimensions(
    config.trimSize,
    config.pageCount,
    config.paperType,
    config.includeBleed
  );

  const coverWidth = inchesToPoints(dims.width);
  const coverHeight = inchesToPoints(dims.height);
  const spineWidth = inchesToPoints(dims.spineWidth);
  const trim = TRIM_SIZES[config.trimSize];
  const trimWidth = inchesToPoints(trim.width);
  const bleedPts = inchesToPoints(config.includeBleed ? KDP_SPECS.bleed : 0);

  return `
#!/usr/bin/env python3
"""
StorySpark Cover PDF Generator
Book ID: ${config.bookId}
Trim Size: ${config.trimSize}
Page Count: ${config.pageCount}
Spine Width: ${dims.spineWidth.toFixed(4)}"
"""

from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
from PIL import Image
import os

# Cover dimensions
COVER_WIDTH = ${coverWidth}
COVER_HEIGHT = ${coverHeight}
SPINE_WIDTH = ${spineWidth}
TRIM_WIDTH = ${trimWidth}
BLEED = ${bleedPts}

# Calculated positions
BACK_COVER_LEFT = BLEED
SPINE_LEFT = BLEED + TRIM_WIDTH
FRONT_COVER_LEFT = BLEED + TRIM_WIDTH + SPINE_WIDTH

def create_cover_pdf(output_path, front_image=None, back_image=None, spine_text="", title="", author=""):
    """Create KDP-ready cover PDF"""
    c = canvas.Canvas(output_path, pagesize=(COVER_WIDTH, COVER_HEIGHT))

    # Background color (can be customized)
    c.setFillColor(HexColor('#FFFFFF'))
    c.rect(0, 0, COVER_WIDTH, COVER_HEIGHT, fill=1)

    # Draw back cover image
    if back_image and os.path.exists(back_image):
        c.drawImage(back_image, BACK_COVER_LEFT, BLEED,
                   TRIM_WIDTH, COVER_HEIGHT - (BLEED * 2),
                   preserveAspectRatio=True, anchor='c')

    # Draw spine
    if SPINE_WIDTH > 0:
        # Spine background
        c.setFillColor(HexColor('#F5F5F5'))
        c.rect(SPINE_LEFT, 0, SPINE_WIDTH, COVER_HEIGHT, fill=1)

        # Spine text (rotated)
        if spine_text:
            c.saveState()
            c.translate(SPINE_LEFT + SPINE_WIDTH / 2, COVER_HEIGHT / 2)
            c.rotate(90)
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(black)
            c.drawCentredString(0, 0, spine_text)
            c.restoreState()

    # Draw front cover image
    if front_image and os.path.exists(front_image):
        c.drawImage(front_image, FRONT_COVER_LEFT, BLEED,
                   TRIM_WIDTH, COVER_HEIGHT - (BLEED * 2),
                   preserveAspectRatio=True, anchor='c')

    # Add safety lines (for review, can be removed for final)
    # c.setStrokeColor(HexColor('#FF0000'))
    # c.setLineWidth(0.5)
    # Trim lines
    # c.line(BLEED, 0, BLEED, COVER_HEIGHT)
    # c.line(COVER_WIDTH - BLEED, 0, COVER_WIDTH - BLEED, COVER_HEIGHT)

    c.save()
    return output_path

if __name__ == "__main__":
    import sys

    output_path = sys.argv[1] if len(sys.argv) > 1 else "cover.pdf"
    front_img = sys.argv[2] if len(sys.argv) > 2 else None
    back_img = sys.argv[3] if len(sys.argv) > 3 else None
    spine = sys.argv[4] if len(sys.argv) > 4 else ""

    result = create_cover_pdf(output_path, front_img, back_img, spine)
    print(f"Created: {result}")
`;
}

/**
 * Export types for the API
 */
export type ExportType = 'interior' | 'cover' | 'complete';
export type ExportFormat = 'pdf' | 'png' | 'jpg';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  bookId: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  outputPath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Validate export configuration
 */
export function validateExportConfig(config: ExportConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.bookId) {
    errors.push('Book ID is required');
  }

  if (!TRIM_SIZES[config.trimSize]) {
    errors.push(`Invalid trim size: ${config.trimSize}`);
  }

  if (!['white', 'cream'].includes(config.paperType)) {
    errors.push(`Invalid paper type: ${config.paperType}`);
  }

  if (!['color', 'bw'].includes(config.colorMode)) {
    errors.push(`Invalid color mode: ${config.colorMode}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended settings for different book types
 */
export function getRecommendedSettings(bookType: string): Partial<ExportConfig> {
  const recommendations: Record<string, Partial<ExportConfig>> = {
    picture: {
      trimSize: '8.5x8.5',
      paperType: 'white',
      includeBleed: true,
      colorMode: 'color'
    },
    board: {
      trimSize: '8x10',
      paperType: 'white',
      includeBleed: true,
      colorMode: 'color'
    },
    early_reader: {
      trimSize: '6x9',
      paperType: 'cream',
      includeBleed: false,
      colorMode: 'bw'
    },
    activity: {
      trimSize: '8.5x11',
      paperType: 'white',
      includeBleed: false,
      colorMode: 'bw'
    },
    coloring: {
      trimSize: '8.5x11',
      paperType: 'white',
      includeBleed: false,
      colorMode: 'bw'
    }
  };

  return recommendations[bookType] || recommendations.picture;
}
