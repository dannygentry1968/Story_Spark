#!/usr/bin/env python3
"""
StorySpark PDF Generator
Generates KDP-ready interior and cover PDFs for children's books
"""

import json
import os
import sys
from pathlib import Path

# PDF generation with reportlab
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Image handling
try:
    from PIL import Image
except ImportError:
    Image = None


# KDP Specifications
TRIM_SIZES = {
    '8.5x8.5': {'width': 8.5, 'height': 8.5},
    '8x10': {'width': 8, 'height': 10},
    '8.5x11': {'width': 8.5, 'height': 11},
    '6x9': {'width': 6, 'height': 9},
    '5.5x8.5': {'width': 5.5, 'height': 8.5}
}

KDP_SPECS = {
    'bleed': 0.125,
    'safe_margin': 0.25,
    'spine_per_page': {
        'white': 0.002252,
        'cream': 0.0025
    }
}


def inches_to_points(inches):
    """Convert inches to PDF points (72 points per inch)"""
    return inches * 72


def calculate_spine_width(page_count, paper_type='white'):
    """Calculate spine width based on page count"""
    return page_count * KDP_SPECS['spine_per_page'].get(paper_type, 0.002252)


def wrap_text(text, font_name, font_size, max_width, canvas_obj):
    """Simple word wrapping for text"""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        if canvas_obj.stringWidth(test_line, font_name, font_size) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def generate_interior(config):
    """
    Generate interior PDF for a children's book

    config = {
        'output_path': str,
        'trim_size': str,
        'include_bleed': bool,
        'pages': [
            {
                'page_number': int,
                'text': str,
                'illustration_path': str,
                'layout': str  # 'full-bleed', 'text-bottom', 'text-left', 'text-right', 'text-only'
            }
        ]
    }
    """
    output_path = config['output_path']
    trim_size = config.get('trim_size', '8.5x8.5')
    include_bleed = config.get('include_bleed', True)
    pages = config.get('pages', [])

    # Get dimensions
    trim = TRIM_SIZES.get(trim_size, TRIM_SIZES['8.5x8.5'])
    bleed = KDP_SPECS['bleed'] if include_bleed else 0
    margin = KDP_SPECS['safe_margin']

    page_width = inches_to_points(trim['width'] + (bleed * 2))
    page_height = inches_to_points(trim['height'] + (bleed * 2))
    bleed_pts = inches_to_points(bleed)
    margin_pts = inches_to_points(margin)

    # Safe area calculations
    safe_left = bleed_pts + margin_pts
    safe_right = page_width - bleed_pts - margin_pts
    safe_top = page_height - bleed_pts - margin_pts
    safe_bottom = bleed_pts + margin_pts
    safe_width = safe_right - safe_left
    safe_height = safe_top - safe_bottom

    # Create PDF
    c = canvas.Canvas(output_path, pagesize=(page_width, page_height))

    for page_data in pages:
        page_num = page_data.get('page_number', 1)
        text = page_data.get('text', '')
        illustration = page_data.get('illustration_path', '')
        layout = page_data.get('layout', 'text-bottom')

        # White background
        c.setFillColor(white)
        c.rect(0, 0, page_width, page_height, fill=1)

        # Draw illustration if present
        if illustration and os.path.exists(illustration):
            try:
                if layout == 'full-bleed':
                    # Full bleed: image fills entire page
                    c.drawImage(illustration, 0, 0, page_width, page_height,
                               preserveAspectRatio=True, anchor='c', mask='auto')
                elif layout == 'text-only':
                    pass  # No illustration for text-only pages
                else:
                    # Image in upper portion with space for text
                    img_height = safe_height * 0.70
                    img_y = safe_bottom + (safe_height * 0.30)
                    c.drawImage(illustration, safe_left, img_y, safe_width, img_height,
                               preserveAspectRatio=True, anchor='c', mask='auto')
            except Exception as e:
                print(f"Warning: Could not load image {illustration}: {e}")

        # Draw text if present
        if text:
            c.setFont("Helvetica", 16)
            c.setFillColor(black)

            # Calculate text area based on layout
            if layout == 'full-bleed':
                # Text overlay at bottom with semi-transparent background
                text_area_height = safe_height * 0.25
                text_y_start = safe_bottom + text_area_height - 10

                # Add semi-transparent background for readability
                c.setFillColor(HexColor('#FFFFFF'))
                c.setFillAlpha(0.85)
                c.rect(safe_left - 10, safe_bottom - 10,
                      safe_width + 20, text_area_height + 20, fill=1)
                c.setFillAlpha(1.0)
                c.setFillColor(black)
            elif layout == 'text-only':
                # Center text on page
                text_y_start = page_height / 2 + 50
            else:
                # Text at bottom
                text_y_start = safe_bottom + (safe_height * 0.25)

            # Wrap and draw text
            lines = wrap_text(text, "Helvetica", 16, safe_width - 40, c)
            line_height = 22

            for i, line in enumerate(lines):
                y_pos = text_y_start - (i * line_height)
                if y_pos > safe_bottom:
                    c.drawCentredString(page_width / 2, y_pos, line)

        # Page number (skip for page 1 and last page typically)
        if page_num > 1:
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor('#888888'))
            c.drawCentredString(page_width / 2, bleed_pts + 15, str(page_num))

        c.showPage()

    c.save()
    print(f"Interior PDF created: {output_path}")
    return output_path


def generate_cover(config):
    """
    Generate cover PDF for a children's book

    config = {
        'output_path': str,
        'trim_size': str,
        'page_count': int,
        'paper_type': str,
        'include_bleed': bool,
        'front_image': str,
        'back_image': str,
        'spine_text': str,
        'title': str,
        'author': str,
        'background_color': str
    }
    """
    output_path = config['output_path']
    trim_size = config.get('trim_size', '8.5x8.5')
    page_count = config.get('page_count', 24)
    paper_type = config.get('paper_type', 'white')
    include_bleed = config.get('include_bleed', True)
    front_image = config.get('front_image', '')
    back_image = config.get('back_image', '')
    spine_text = config.get('spine_text', '')
    title = config.get('title', '')
    author = config.get('author', '')
    bg_color = config.get('background_color', '#FFFFFF')

    # Get dimensions
    trim = TRIM_SIZES.get(trim_size, TRIM_SIZES['8.5x8.5'])
    bleed = KDP_SPECS['bleed'] if include_bleed else 0
    spine_width = calculate_spine_width(page_count, paper_type)

    # Full cover dimensions
    cover_width = inches_to_points((trim['width'] * 2) + spine_width + (bleed * 2))
    cover_height = inches_to_points(trim['height'] + (bleed * 2))
    spine_width_pts = inches_to_points(spine_width)
    trim_width_pts = inches_to_points(trim['width'])
    bleed_pts = inches_to_points(bleed)

    # Position calculations
    back_cover_left = bleed_pts
    spine_left = bleed_pts + trim_width_pts
    front_cover_left = bleed_pts + trim_width_pts + spine_width_pts

    # Create PDF
    c = canvas.Canvas(output_path, pagesize=(cover_width, cover_height))

    # Background
    c.setFillColor(HexColor(bg_color))
    c.rect(0, 0, cover_width, cover_height, fill=1)

    # Back cover
    if back_image and os.path.exists(back_image):
        try:
            c.drawImage(back_image, back_cover_left, bleed_pts,
                       trim_width_pts, cover_height - (bleed_pts * 2),
                       preserveAspectRatio=True, anchor='c', mask='auto')
        except Exception as e:
            print(f"Warning: Could not load back cover image: {e}")

    # Spine
    if spine_width_pts > 10:  # Only draw spine content if wide enough
        # Spine background (slightly different shade)
        c.setFillColor(HexColor('#F8F8F8'))
        c.rect(spine_left, 0, spine_width_pts, cover_height, fill=1)

        # Spine text (rotated 90 degrees)
        if spine_text:
            c.saveState()
            c.translate(spine_left + spine_width_pts / 2, cover_height / 2)
            c.rotate(90)

            # Adjust font size based on spine width
            font_size = min(12, spine_width_pts * 0.6)
            c.setFont("Helvetica-Bold", font_size)
            c.setFillColor(black)
            c.drawCentredString(0, -font_size/3, spine_text)

            c.restoreState()

    # Front cover
    if front_image and os.path.exists(front_image):
        try:
            c.drawImage(front_image, front_cover_left, bleed_pts,
                       trim_width_pts, cover_height - (bleed_pts * 2),
                       preserveAspectRatio=True, anchor='c', mask='auto')
        except Exception as e:
            print(f"Warning: Could not load front cover image: {e}")
    else:
        # Generate placeholder front cover with title
        # Title
        if title:
            c.setFont("Helvetica-Bold", 36)
            c.setFillColor(black)
            title_x = front_cover_left + trim_width_pts / 2
            title_y = cover_height * 0.6
            c.drawCentredString(title_x, title_y, title)

        # Author
        if author:
            c.setFont("Helvetica", 18)
            c.setFillColor(HexColor('#666666'))
            author_x = front_cover_left + trim_width_pts / 2
            author_y = cover_height * 0.4
            c.drawCentredString(author_x, author_y, f"by {author}")

    # Add trim lines for reference (optional - comment out for final)
    # c.setStrokeColor(HexColor('#CCCCCC'))
    # c.setDash(3, 3)
    # c.line(bleed_pts, 0, bleed_pts, cover_height)  # Left trim
    # c.line(cover_width - bleed_pts, 0, cover_width - bleed_pts, cover_height)  # Right trim
    # c.line(0, bleed_pts, cover_width, bleed_pts)  # Bottom trim
    # c.line(0, cover_height - bleed_pts, cover_width, cover_height - bleed_pts)  # Top trim

    c.save()
    print(f"Cover PDF created: {output_path}")
    print(f"  - Dimensions: {cover_width/72:.2f}\" x {cover_height/72:.2f}\"")
    print(f"  - Spine width: {spine_width:.4f}\"")
    return output_path


def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 2:
        print("Usage: python generate_pdf.py <config_json>")
        print("  or: python generate_pdf.py --type <interior|cover> --config <json_file>")
        sys.exit(1)

    # Parse arguments
    if sys.argv[1] == '--type':
        pdf_type = sys.argv[2]
        config_file = sys.argv[4] if sys.argv[3] == '--config' else sys.argv[3]

        with open(config_file, 'r') as f:
            config = json.load(f)
    else:
        # Direct JSON config
        config = json.loads(sys.argv[1])
        pdf_type = config.get('type', 'interior')

    # Generate PDF
    if pdf_type == 'interior':
        result = generate_interior(config)
    elif pdf_type == 'cover':
        result = generate_cover(config)
    else:
        print(f"Unknown PDF type: {pdf_type}")
        sys.exit(1)

    # Output result as JSON for API consumption
    print(json.dumps({
        'success': True,
        'output_path': result,
        'type': pdf_type
    }))


if __name__ == "__main__":
    main()
