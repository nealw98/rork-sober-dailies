#!/usr/bin/env python3
"""
Big Book PDF Extractor (2nd Edition - Public Domain)

This script extracts text from the Big Book 2nd Edition PDF maintaining proper structure,
page numbers, and chapter boundaries.

Requirements:
    pip install pypdf requests

Usage:
    python extract_bigbook.py

Output:
    Creates TypeScript files in constants/bigbook-v2/content/ directory
"""

import re
import json
import requests
from pathlib import Path
from typing import List, Dict, Tuple, Optional
try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        print("Please install pypdf: pip install pypdf requests")
        exit(1)

# Chapter structure for the Big Book (2nd Edition)
# Based on actual PDF page indices (0-indexed)
CHAPTER_STRUCTURE = {
    'preface': {
        'title': 'Preface',
        'pdf_pages': [2, 3],
        'book_pages': ['xi', 'xii'],
        'use_roman': True,
    },
    'foreword-first': {
        'title': 'Foreword to First Edition',
        'pdf_pages': [4, 5],
        'book_pages': ['xiii', 'xiv'],
        'use_roman': True,
    },
    'foreword-second': {
        'title': 'Foreword to Second Edition', 
        'pdf_pages': [6, 7, 8, 9, 10, 11, 12],
        'book_pages': ['xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'],
        'use_roman': True,
    },
    'doctors-opinion': {
        'title': "The Doctor's Opinion",
        'pdf_pages': [13, 14, 15, 16, 17, 18, 19],
        'book_pages': ['xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix'],
        'use_roman': True,
    },
    'chapter-1': {
        'title': "Bill's Story",
        'chapter_number': 1,
        'pdf_pages': list(range(20, 34)),  # Approximately pages 1-14
        'book_pages': list(range(1, 15)),
    },
    'chapter-2': {
        'title': 'There Is a Solution',
        'chapter_number': 2,
        'pdf_pages': list(range(34, 46)),
        'book_pages': list(range(17, 29)),
    },
    'chapter-3': {
        'title': 'More About Alcoholism',
        'chapter_number': 3,
        'pdf_pages': list(range(46, 60)),
        'book_pages': list(range(30, 44)),
    },
    'chapter-4': {
        'title': 'We Agnostics',
        'chapter_number': 4,
        'pdf_pages': list(range(60, 74)),
        'book_pages': list(range(44, 58)),
    },
    'chapter-5': {
        'title': 'How It Works',
        'chapter_number': 5,
        'pdf_pages': list(range(74, 88)),
        'book_pages': list(range(58, 72)),
    },
    'chapter-6': {
        'title': 'Into Action',
        'chapter_number': 6,
        'pdf_pages': list(range(88, 105)),
        'book_pages': list(range(72, 89)),
    },
    'chapter-7': {
        'title': 'Working with Others',
        'chapter_number': 7,
        'pdf_pages': list(range(105, 120)),
        'book_pages': list(range(89, 104)),
    },
    'chapter-8': {
        'title': 'To Wives',
        'chapter_number': 8,
        'pdf_pages': list(range(120, 138)),
        'book_pages': list(range(104, 122)),
    },
    'chapter-9': {
        'title': 'The Family Afterward',
        'chapter_number': 9,
        'pdf_pages': list(range(138, 152)),
        'book_pages': list(range(122, 136)),
    },
    'chapter-10': {
        'title': 'To Employers',
        'chapter_number': 10,
        'pdf_pages': list(range(152, 167)),
        'book_pages': list(range(136, 151)),
    },
    'chapter-11': {
        'title': 'A Vision for You',
        'chapter_number': 11,
        'pdf_pages': list(range(167, 181)),
        'book_pages': list(range(151, 165)),
    },
}

def download_pdf(url: str, output_path: Path) -> bool:
    """Download PDF from URL."""
    print(f"Downloading PDF from {url}...")
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        output_path.write_bytes(response.content)
        print(f"PDF downloaded to {output_path}")
        return True
    except Exception as e:
        print(f"Error downloading PDF: {e}")
        return False

def extract_text_by_page(pdf_path: Path) -> Dict[int, str]:
    """Extract text from PDF, returning dict of pdf_page_index: text."""
    print(f"Extracting text from {pdf_path}...")
    reader = PdfReader(str(pdf_path))
    pages = {}
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        pages[i] = text  # Keep 0-indexed for now
    
    print(f"Extracted {len(pages)} pages")
    return pages

def clean_text(text: str) -> str:
    """Clean extracted text - remove page numbers, headers, footers, extra whitespace."""
    # Remove isolated page numbers (both arabic and roman)
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*[xivlcdm]+\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    # Remove common headers/footers
    text = re.sub(r'ALCOHOLICS ANONYMOUS', '', text, flags=re.IGNORECASE)
    text = re.sub(r'THE DOCTOR\'S OPINION', '', text, flags=re.IGNORECASE)
    text = re.sub(r'FOREWORD', '', text, flags=re.IGNORECASE)
    
    # Fix hyphenated words broken across lines
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    
    # Remove multiple consecutive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(line for line in lines if line)
    
    return text.strip()

def split_into_paragraphs(text: str) -> List[str]:
    """Split text into paragraphs."""
    # Split on double newlines or more
    paragraphs = re.split(r'\n\n+', text)
    
    # Filter out empty paragraphs and clean
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    return paragraphs

def extract_chapter_content(pages: Dict[int, str], chapter_id: str, chapter_info: Dict) -> List[Dict]:
    """Extract paragraphs for a specific chapter."""
    pdf_pages = chapter_info['pdf_pages']  # Already adjusted by main()
    book_pages = chapter_info['book_pages']
    
    # Collect all text for this chapter
    chapter_paragraphs = []
    order = 1
    
    for i, pdf_index in enumerate(pdf_pages):
        if pdf_index not in pages:
            print(f"     ⚠️  PDF page {pdf_index} not found")
            continue
        
        text = pages[pdf_index]
        cleaned = clean_text(text)
        page_paragraphs = split_into_paragraphs(cleaned)
        
        # Get the book page number for this PDF page
        book_page = book_pages[i] if i < len(book_pages) else pdf_index
        
        for para in page_paragraphs:
            if len(para) < 10:  # Skip very short paragraphs (likely artifacts)
                continue
            
            # Skip if paragraph is just the chapter title
            if para.strip().lower() == chapter_info['title'].lower():
                continue
                
            chapter_paragraphs.append({
                'id': f'{chapter_id}-p{order}',
                'chapterId': chapter_id,
                'pageNumber': book_page,
                'order': order,
                'content': para,
            })
            order += 1
    
    return chapter_paragraphs

def generate_typescript_file(chapter_id: str, chapter_info: Dict, paragraphs: List[Dict]) -> str:
    """Generate TypeScript file content for a chapter."""
    title = chapter_info['title']
    book_pages = chapter_info['book_pages']
    chapter_number = chapter_info.get('chapter_number')
    use_roman = chapter_info.get('use_roman', False)
    
    # Determine page range for display
    if isinstance(book_pages[0], str):
        # Roman numerals
        page_range_str = f"{book_pages[0]}–{book_pages[-1]}"
    else:
        # Arabic numbers
        page_range_str = f"{book_pages[0]}–{book_pages[-1]}"
    
    # Start building the TypeScript file
    lines = [
        "import { BigBookChapter } from '@/types/bigbook-v2';",
        "",
        "/**",
        f" * {title}",
    ]
    
    if chapter_number:
        lines.append(f" * Chapter {chapter_number}")
    
    lines.extend([
        f" * ",
        f" * Pages {page_range_str}",
        " */",
        "",
        f"export const {chapter_id.replace('-', '_')}: BigBookChapter = {{",
        f"  id: '{chapter_id}',",
        f"  title: '{title.replace(chr(39), chr(92) + chr(39))}',"
    ])
    
    if chapter_number:
        lines.append(f"  chapterNumber: {chapter_number},")
    
    # Use numeric page range for TypeScript
    first_page = book_pages[0] if isinstance(book_pages[0], int) else len(book_pages)
    last_page = book_pages[-1] if isinstance(book_pages[-1], int) else len(book_pages)
    
    lines.extend([
        f"  pageRange: [{first_page}, {last_page}],",
        "  paragraphs: ["
    ])
    
    # Add paragraphs
    for i, para in enumerate(paragraphs):
        # Escape content for TypeScript string
        content = (para['content']
                   .replace('\\', '\\\\')
                   .replace("'", "\\'")
                   .replace('\n', ' ')
                   .replace('\r', ''))
        
        # Handle page number (could be roman numeral or number)
        page_display = para['pageNumber']
        if isinstance(page_display, str):
            page_num_for_ts = f"'{page_display}'"
        else:
            page_num_for_ts = str(page_display)
        
        lines.append("    {")
        lines.append(f"      id: '{para['id']}',")
        lines.append(f"      chapterId: '{para['chapterId']}',")
        lines.append(f"      pageNumber: {page_num_for_ts},")
        lines.append(f"      order: {para['order']},")
        lines.append(f"      content: '{content}',")
        lines.append("    }," if i < len(paragraphs) - 1 else "    }")
    
    lines.extend([
        "  ],",
        "};",
        ""
    ])
    
    return '\n'.join(lines)

def main():
    """Main extraction process."""
    # Setup paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / 'constants' / 'bigbook-v2' / 'content'
    pdf_path = script_dir / 'BigBook.pdf'
    
    # Download PDF if not present
    if not pdf_path.exists():
        pdf_url = 'https://12step.org/docs/BigBook.pdf'
        print(f"\n📥 PDF not found locally, downloading...")
        if not download_pdf(pdf_url, pdf_path):
            print("❌ Failed to download PDF. Please download it manually to:")
            print(f"   {pdf_path}")
            return
    
    print(f"\n📖 Using PDF: {pdf_path}\n")
    
    # Extract all pages
    pages = extract_text_by_page(pdf_path)
    print(f"   Total pages in PDF: {len(pages)}\n")
    
    # Inspect first few pages to determine offset
    print("🔍 Inspecting PDF structure...")
    print("   First 5 pages preview:")
    for i in range(min(5, len(pages))):
        preview = pages[i][:100].replace('\n', ' ')
        print(f"   Page {i}: {preview}...")
    print()
    
    # Ask user for PDF offset
    print("⚙️  PDF offset adjustment:")
    print("   The PDF offset is the number of pages before the actual book content starts.")
    print("   (e.g., cover pages, title pages, copyright pages)")
    print()
    
    # No need for offset - page numbers are already mapped correctly
    print("   ✅ Using pre-mapped page indices from PDF structure analysis")
    print()
    
    # Process each chapter
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("EXTRACTING CHAPTERS")
    print("=" * 70)
    
    for chapter_id, chapter_info in CHAPTER_STRUCTURE.items():
        print(f"\n📝 {chapter_id}: {chapter_info['title']}...")
        
        paragraphs = extract_chapter_content(pages, chapter_id, chapter_info)
        
        if not paragraphs:
            print(f"   ⚠️  WARNING: No paragraphs extracted for {chapter_id}")
            continue
        
        print(f"   ✅ Extracted {len(paragraphs)} paragraphs")
        
        # Generate TypeScript file
        ts_content = generate_typescript_file(chapter_id, chapter_info, paragraphs)
        
        # Write file
        output_file = output_dir / f'{chapter_id}.ts'
        output_file.write_text(ts_content, encoding='utf-8')
        print(f"   💾 Written to {output_file.name}")
    
    print("\n" + "=" * 70)
    print("✅ EXTRACTION COMPLETE!")
    print("=" * 70)
    print(f"\n📁 Generated files in: {output_dir}")
    print("\n📋 Next steps:")
    print("   1. Run validation: python scripts/validate_bigbook.py")
    print("   2. Review the generated files for accuracy")
    print("   3. Adjust PDF offset or page mappings if needed")
    print("   4. Test in your app")
    print()

# Global variable for PDF offset (set in main())
PDF_OFFSET_GLOBAL = 0

if __name__ == '__main__':
    main()

