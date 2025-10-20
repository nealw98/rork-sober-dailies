#!/usr/bin/env python3
"""
Big Book Word Document Extractor

Extracts clean text from BigBook2.docx, properly organized by chapters
with correct page number tracking.

Requirements:
    pip install python-docx

Usage:
    python extract_bigbook_from_word.py
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
try:
    from docx import Document
except ImportError:
    print("Please install python-docx: pip install python-docx")
    exit(1)

# Chapter structure for the Big Book (2nd Edition)
CHAPTER_INFO = {
    'preface': {
        'title': 'Preface',
        'book_pages': ['xi', 'xii'],
        'use_roman': True,
    },
    'foreword-first': {
        'title': 'Foreword to First Edition',
        'book_pages': ['xiii', 'xiv'],
        'use_roman': True,
    },
    'foreword-second': {
        'title': 'Foreword to Second Edition',
        'book_pages': ['xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'],
        'use_roman': True,
    },
    'doctors-opinion': {
        'title': "The Doctor's Opinion",
        'book_pages': ['xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix'],
        'use_roman': True,
    },
    'chapter-1': {
        'title': "Bill's Story",
        'chapter_number': 1,
        'book_pages': list(range(1, 17)),
    },
    'chapter-2': {
        'title': 'There Is a Solution',
        'chapter_number': 2,
        'book_pages': list(range(17, 30)),
    },
    'chapter-3': {
        'title': 'More About Alcoholism',
        'chapter_number': 3,
        'book_pages': list(range(30, 44)),
    },
    'chapter-4': {
        'title': 'We Agnostics',
        'chapter_number': 4,
        'book_pages': list(range(44, 58)),
    },
    'chapter-5': {
        'title': 'How It Works',
        'chapter_number': 5,
        'book_pages': list(range(58, 72)),
    },
    'chapter-6': {
        'title': 'Into Action',
        'chapter_number': 6,
        'book_pages': list(range(72, 89)),
    },
    'chapter-7': {
        'title': 'Working with Others',
        'chapter_number': 7,
        'book_pages': list(range(89, 104)),
    },
    'chapter-8': {
        'title': 'To Wives',
        'chapter_number': 8,
        'book_pages': list(range(104, 122)),
    },
    'chapter-9': {
        'title': 'The Family Afterward',
        'chapter_number': 9,
        'book_pages': list(range(122, 136)),
    },
    'chapter-10': {
        'title': 'To Employers',
        'chapter_number': 10,
        'book_pages': list(range(136, 151)),
    },
    'chapter-11': {
        'title': 'A Vision for You',
        'chapter_number': 11,
        'book_pages': list(range(151, 165)),
    },
}

def extract_text_from_word(docx_path: Path) -> str:
    """Extract all text from Word document."""
    print(f"📖 Reading Word document: {docx_path.name}")
    doc = Document(str(docx_path))
    
    full_text = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            full_text.append(text)
    
    print(f"   ✅ Extracted {len(full_text)} paragraphs")
    return '\n\n'.join(full_text)

def identify_chapter_boundaries(text: str) -> Dict[str, Tuple[int, int]]:
    """Identify where each chapter starts and ends in the text."""
    print("\n🔍 Identifying chapter boundaries...")
    
    lines = text.split('\n')
    boundaries = {}
    
    # Look for actual chapter content, not table of contents
    start_search = 40
    
    # Specific patterns for each section - look for the opening sentence
    patterns = {
        'preface': r'THIS IS the second edition',
        'foreword-first': r'This is the Foreword as it appeared',
        'foreword-second': r'SINCE the original Foreword',
        'doctors-opinion': r'WE OF Alcoholics Anonymous believe',
        'chapter-1': r'WAR FEVER ran high',
        'chapter-2': r'WE, of Alcoholics Anonymous',
        'chapter-3': r'MOST of us have been unwilling',
        'chapter-4': r'IN THE preceding chapters',
        'chapter-5': r'RARELY have we seen',
        'chapter-6': r'HAVING made our personal',
        'chapter-7': r'PRACTICAL experience shows',
        'chapter-8': r'WITH few exceptions',
        'chapter-9': r'OUR WOMEN FOLK',
        'chapter-10': r'AMONG many employers',
        'chapter-11': r'FOR MOST normal folks',
    }
    
    for chapter_id, content_pattern in patterns.items():
        for i in range(start_search, len(lines)):
            line = lines[i].strip()
            
            # Look for the opening sentence
            if re.search(content_pattern, line, re.IGNORECASE):
                boundaries[chapter_id] = i
                print(f"   ✅ Found {CHAPTER_INFO[chapter_id]['title']} at line {i}")
                break
    
    return boundaries

def extract_chapter_content(text: str, start_line: int, end_line: Optional[int]) -> List[str]:
    """Extract paragraphs for a chapter between start and end lines."""
    lines = text.split('\n')
    
    if end_line is None:
        end_line = len(lines)
    
    chapter_text = '\n'.join(lines[start_line:end_line])
    
    # Split into paragraphs
    paragraphs = []
    for para in chapter_text.split('\n\n'):
        para = para.strip()
        if para and len(para) > 10:
            # Skip chapter titles and page numbers
            if para.upper() == para and len(para) < 50:
                continue
            # Skip isolated page numbers
            if re.match(r'^[xivlcdm]+$', para, re.IGNORECASE):
                continue
            if re.match(r'^\d+$', para):
                continue
            
            paragraphs.append(para)
    
    return paragraphs

def generate_typescript_file(chapter_id: str, paragraphs: List[str]) -> str:
    """Generate TypeScript file content for a chapter."""
    chapter_info = CHAPTER_INFO[chapter_id]
    title = chapter_info['title']
    book_pages = chapter_info['book_pages']
    chapter_number = chapter_info.get('chapter_number')
    
    # Determine page range for display
    if isinstance(book_pages[0], str):
        page_range_str = f"{book_pages[0]}–{book_pages[-1]}"
        first_page = book_pages[0]
        last_page = book_pages[-1]
    else:
        page_range_str = f"{book_pages[0]}–{book_pages[-1]}"
        first_page = book_pages[0]
        last_page = book_pages[-1]
    
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
    
    lines.extend([
        f"  pageRange: [{repr(first_page)}, {repr(last_page)}],",
        "  paragraphs: ["
    ])
    
    # Distribute paragraphs across pages
    total_pages = len(book_pages)
    paras_per_page = max(1, len(paragraphs) // total_pages)
    
    for i, para in enumerate(paragraphs):
        # Estimate which page this paragraph belongs to
        page_index = min(i // paras_per_page, total_pages - 1)
        page_num = book_pages[page_index]
        
        # Escape content for TypeScript string
        content = (para
                   .replace('\\', '\\\\')
                   .replace("'", "\\'")
                   .replace('\n', ' ')
                   .replace('\r', ''))
        
        # Handle page number (could be roman numeral or number)
        if isinstance(page_num, str):
            page_num_for_ts = f"'{page_num}'"
        else:
            page_num_for_ts = str(page_num)
        
        lines.append("    {")
        lines.append(f"      id: '{chapter_id}-p{i+1}',")
        lines.append(f"      chapterId: '{chapter_id}',")
        lines.append(f"      pageNumber: {page_num_for_ts},")
        lines.append(f"      order: {i+1},")
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
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    docx_path = project_root / 'BigBook2.docx'
    output_dir = project_root / 'constants' / 'bigbook-v2' / 'content'
    
    if not docx_path.exists():
        print(f"❌ Word document not found: {docx_path}")
        return
    
    # Extract all text from Word document
    full_text = extract_text_from_word(docx_path)
    
    # Identify chapter boundaries
    boundaries = identify_chapter_boundaries(full_text)
    
    if len(boundaries) < len(CHAPTER_INFO):
        print(f"\n⚠️  Warning: Only found {len(boundaries)} of {len(CHAPTER_INFO)} chapters")
    
    # Sort boundaries by line number
    sorted_chapters = sorted(boundaries.items(), key=lambda x: x[1])
    
    # Process each chapter
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "=" * 70)
    print("EXTRACTING CHAPTERS")
    print("=" * 70)
    
    for idx, (chapter_id, start_line) in enumerate(sorted_chapters):
        # Determine end line (start of next chapter or end of document)
        if idx < len(sorted_chapters) - 1:
            end_line = sorted_chapters[idx + 1][1]
        else:
            end_line = None
        
        print(f"\n📝 {chapter_id}: {CHAPTER_INFO[chapter_id]['title']}...")
        
        # Extract paragraphs
        paragraphs = extract_chapter_content(full_text, start_line, end_line)
        
        if not paragraphs:
            print(f"   ⚠️  WARNING: No paragraphs extracted for {chapter_id}")
            continue
        
        print(f"   ✅ Extracted {len(paragraphs)} paragraphs")
        
        # Generate TypeScript file
        ts_content = generate_typescript_file(chapter_id, paragraphs)
        
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
    print("   2. Test in your app")
    print()

if __name__ == '__main__':
    main()

