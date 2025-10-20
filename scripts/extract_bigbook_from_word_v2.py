#!/usr/bin/env python3
"""
Big Book Word Document Extractor - Using Document Structure

Extracts clean text from BigBook2.docx using the document's built-in structure
(section breaks, paragraph formatting, etc.) to properly organize chapters.

Requirements:
    pip install python-docx

Usage:
    python extract_bigbook_from_word_v2.py
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
try:
    from docx import Document
    from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
except ImportError:
    print("Please install python-docx: pip install python-docx")
    exit(1)

# Chapter information with alternate titles (for OCR variations)
CHAPTER_INFO = {
    'preface': {
        'title': 'Preface',
        'match_titles': ['PREFACE'],
        'book_pages': ['xi', 'xii'], 
        'use_roman': True
    },
    'foreword-first': {
        'title': 'Foreword to First Edition',
        'match_titles': ['FOREWORD TO THE FIRST EDITION'],
        'book_pages': ['xiii', 'xiv'], 
        'use_roman': True
    },
    'foreword-second': {
        'title': 'Foreword to Second Edition',
        'match_titles': ['FOREWORD TO SECOND EDITION', 'FOREWORD'],
        'book_pages': ['xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'], 
        'use_roman': True
    },
    'doctors-opinion': {
        'title': "The Doctor's Opinion",
        'match_titles': ["THE DOCTOR'S OPINION", "THE DO CTOR'S OPINION", "THE DOCTOR'S OPI NION"],
        'book_pages': ['xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix'], 
        'use_roman': True
    },
    'chapter-1': {
        'title': "Bill's Story",
        'chapter_number': 1,
        'match_titles': ["BILL'S STORY"],
        'book_pages': list(range(1, 17))
    },
    'chapter-2': {
        'title': 'There Is a Solution',
        'chapter_number': 2,
        'match_titles': ['THERE IS A SOLUTION'],
        'book_pages': list(range(17, 30))
    },
    'chapter-3': {
        'title': 'More About Alcoholism',
        'chapter_number': 3,
        'match_titles': ['MORE ABOUT ALCOHOLISM', 'MORE ABO UT ALCOHOLISM'],
        'book_pages': list(range(30, 44))
    },
    'chapter-4': {
        'title': 'We Agnostics',
        'chapter_number': 4,
        'match_titles': ['WE AGNOSTICS'],
        'book_pages': list(range(44, 58))
    },
    'chapter-5': {
        'title': 'How It Works',
        'chapter_number': 5,
        'match_titles': ['HOW IT WORKS'],
        'book_pages': list(range(58, 72))
    },
    'chapter-6': {
        'title': 'Into Action',
        'chapter_number': 6,
        'match_titles': ['INTO ACTION'],
        'book_pages': list(range(72, 89))
    },
    'chapter-7': {
        'title': 'Working with Others',
        'chapter_number': 7,
        'match_titles': ['WORKING WITH OTHERS'],
        'book_pages': list(range(89, 104))
    },
    'chapter-8': {
        'title': 'To Wives',
        'chapter_number': 8,
        'match_titles': ['TO WIVES', 'TO WIVES*'],
        'book_pages': list(range(104, 122))
    },
    'chapter-9': {
        'title': 'The Family Afterward',
        'chapter_number': 9,
        'match_titles': ['THE FAMILY AFTERWARD'],
        'book_pages': list(range(122, 136))
    },
    'chapter-10': {
        'title': 'To Employers',
        'chapter_number': 10,
        'match_titles': ['TO EMPLOYERS'],
        'book_pages': list(range(136, 151))
    },
    'chapter-11': {
        'title': 'A Vision for You',
        'chapter_number': 11,
        'match_titles': ['A VISION FOR YOU'],
        'book_pages': list(range(151, 165))
    },
}

def extract_chapters_from_word(docx_path: Path) -> Dict[str, List[str]]:
    """Extract chapters using Word document structure."""
    print(f"📖 Reading Word document: {docx_path.name}")
    doc = Document(str(docx_path))
    
    chapters = {}
    current_chapter = None
    current_paragraphs = []
    
    # Map chapter titles to chapter IDs (handle multiple title variations)
    title_to_id = {}
    for chapter_id, info in CHAPTER_INFO.items():
        for match_title in info['match_titles']:
            title_to_id[match_title] = chapter_id
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        # Skip empty paragraphs
        if not text:
            continue
        
        # Check if this is a chapter title (all caps, matches our list)
        text_upper = text.upper()
        if text_upper in title_to_id and len(text) < 50:
            # Save previous chapter if exists
            if current_chapter and current_paragraphs:
                chapters[current_chapter] = current_paragraphs
                print(f"   ✅ Extracted {CHAPTER_INFO[current_chapter]['title']}: {len(current_paragraphs)} paragraphs")
            
            # Start new chapter
            current_chapter = title_to_id[text_upper]
            current_paragraphs = []
            continue
        
        # Skip "Section Break (Next Page)" markers
        if 'Section Break' in text:
            continue
        
        # Skip isolated page numbers
        if re.match(r'^[xivlcdm]+$', text, re.IGNORECASE) or re.match(r'^\d+$', text):
            continue
        
        # Skip very short lines (likely artifacts)
        if len(text) < 15:
            continue
        
        # Add paragraph to current chapter
        if current_chapter:
            current_paragraphs.append(text)
    
    # Save the last chapter
    if current_chapter and current_paragraphs:
        chapters[current_chapter] = current_paragraphs
        print(f"   ✅ Extracted {CHAPTER_INFO[current_chapter]['title']}: {len(current_paragraphs)} paragraphs")
    
    return chapters

def generate_typescript_file(chapter_id: str, paragraphs: List[str]) -> str:
    """Generate TypeScript file content for a chapter."""
    chapter_info = CHAPTER_INFO[chapter_id]
    title = chapter_info['title'].title()  # Convert from ALL CAPS to Title Case
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
    
    # Extract chapters using document structure
    chapters = extract_chapters_from_word(docx_path)
    
    print(f"\n📊 Summary: Extracted {len(chapters)} chapters")
    
    # Process each chapter
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "=" * 70)
    print("GENERATING TYPESCRIPT FILES")
    print("=" * 70)
    
    for chapter_id in CHAPTER_INFO.keys():
        if chapter_id not in chapters:
            print(f"\n⚠️  {chapter_id}: NOT FOUND - skipping")
            continue
        
        paragraphs = chapters[chapter_id]
        print(f"\n📝 {chapter_id}: {CHAPTER_INFO[chapter_id]['title']}")
        print(f"   ✅ {len(paragraphs)} paragraphs")
        
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
    print("   2. Check a few files to verify clean text")
    print("   3. Test in your app")
    print()

if __name__ == '__main__':
    main()

