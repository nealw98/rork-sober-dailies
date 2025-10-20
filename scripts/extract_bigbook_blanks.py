#!/usr/bin/env python3
"""
Big Book Extractor - Blank Line Based Paragraphs

Uses blank lines in the Word document as true paragraph separators.
Merges all text between blank lines into complete paragraphs.
"""

from pathlib import Path
from typing import List, Dict
import re
try:
    from docx import Document
except ImportError:
    print("Please install python-docx: pip install python-docx")
    exit(1)

# Exact chapter boundaries (paragraph indices in the Word document)
CHAPTERS = [
    {'id': 'preface', 'title': 'Preface', 'start': 46, 'end': 67, 'pages': ('xi', 'xii')},
    {'id': 'foreword-first', 'title': 'Foreword to First Edition', 'start': 68, 'end': 96, 'pages': ('xiii', 'xiv')},
    {'id': 'foreword-second', 'title': 'Foreword to Second Edition', 'start': 96, 'end': 174, 'pages': ('xv', 'xxii')},
    {'id': 'doctors-opinion', 'title': "The Doctor's Opinion", 'start': 174, 'end': 285, 'pages': ('xxiii', 'xxx')},
    {'id': 'chapter-1', 'title': "Bill's Story", 'start': 286, 'end': 509, 'pages': (1, 16), 'number': 1},
    {'id': 'chapter-2', 'title': 'There Is a Solution', 'start': 510, 'end': 681, 'pages': (17, 29), 'number': 2},
    {'id': 'chapter-3', 'title': 'More About Alcoholism', 'start': 682, 'end': 856, 'pages': (30, 43), 'number': 3},
    {'id': 'chapter-4', 'title': 'We Agnostics', 'start': 857, 'end': 1025, 'pages': (44, 57), 'number': 4},
    {'id': 'chapter-5', 'title': 'How It Works', 'start': 1026, 'end': 1218, 'pages': (58, 71), 'number': 5},
    {'id': 'chapter-6', 'title': 'Into Action', 'start': 1219, 'end': 1407, 'pages': (72, 88), 'number': 6},
    {'id': 'chapter-7', 'title': 'Working with Others', 'start': 1408, 'end': 1580, 'pages': (89, 103), 'number': 7},
    {'id': 'chapter-8', 'title': 'To Wives', 'start': 1581, 'end': 1811, 'pages': (104, 121), 'number': 8},
    {'id': 'chapter-9', 'title': 'The Family Afterward', 'start': 1812, 'end': 1971, 'pages': (122, 135), 'number': 9},
    {'id': 'chapter-10', 'title': 'To Employers', 'start': 1972, 'end': 2154, 'pages': (136, 150), 'number': 10},
    {'id': 'chapter-11', 'title': 'A Vision for You', 'start': 2155, 'end': 2360, 'pages': (151, 164), 'number': 11},
]

# Roman numeral map
ROMAN_MAP = {
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15, 'xvi': 16, 'xvii': 17,
    'xviii': 18, 'xix': 19, 'xx': 20, 'xxi': 21, 'xxii': 22, 'xxiii': 23,
    'xxiv': 24, 'xxv': 25, 'xxvi': 26, 'xxvii': 27, 'xxviii': 28, 'xxix': 29, 'xxx': 30
}

def is_page_marker(text: str) -> bool:
    """Check if text is just a page number or page header."""
    if not text:
        return True
    
    # Roman numerals
    if text.lower() in ROMAN_MAP:
        return True
    
    # Single numbers
    if text.isdigit():
        return True
    
    # Page headers like "xii PREFACE" (has tab)
    if '\t' in text:
        return True
    
    # All caps headers that are short
    if text.isupper() and len(text) < 60:
        return True
    
    return False

def extract_paragraphs_by_blank_lines(paragraphs: List[str], start: int, end: int) -> List[str]:
    """
    Extract paragraphs using blank lines as separators.
    All text between blank lines is merged into one paragraph.
    """
    complete_paragraphs = []
    current_paragraph_lines = []
    
    for i in range(start, end):
        text = paragraphs[i].strip()
        
        # Empty line = paragraph break
        if not text:
            if current_paragraph_lines:
                # Merge all accumulated lines into one paragraph
                merged = merge_lines(current_paragraph_lines)
                if merged:
                    complete_paragraphs.append(merged)
                current_paragraph_lines = []
            continue
        
        # Skip page markers and headers
        if is_page_marker(text):
            continue
        
        # Skip all-caps section headers (but not content)
        if text.isupper() and len(text) < 60:
            continue
        
        # Accumulate lines for current paragraph
        current_paragraph_lines.append(text)
    
    # Don't forget last paragraph
    if current_paragraph_lines:
        merged = merge_lines(current_paragraph_lines)
        if merged:
            complete_paragraphs.append(merged)
    
    return complete_paragraphs

def merge_lines(lines: List[str]) -> str:
    """
    Merge multiple lines into one paragraph.
    Handles hyphenation at line breaks.
    """
    if not lines:
        return ''
    
    result = lines[0]
    
    for line in lines[1:]:
        # Handle hyphenated words split across lines
        if result.endswith('-') or result.endswith('- '):
            # Remove hyphen and space, join directly
            result = result.rstrip('- ') + line
        else:
            # Add space between lines
            result = result + ' ' + line
    
    # Now fix hyphenation within the same line
    # Pattern 1: lowercase letter + hyphen + space + lowercase letter (e.g., "There- fore")
    result = re.sub(r'([a-z])-\s+([a-z])', r'\1\2', result)
    
    # Pattern 2: uppercase letter + hyphen + space + uppercase letter (e.g., "SOLU- TION")
    result = re.sub(r'([A-Z])-\s+([A-Z])', r'\1\2', result)
    
    # Replace double hyphens with em dash
    result = result.replace('--', '—')
    
    return result.strip()

def generate_typescript(chapter_info: Dict, content: List[str]) -> str:
    """Generate TypeScript file."""
    chapter_id = chapter_info['id']
    title = chapter_info['title']
    start_page, end_page = chapter_info['pages']
    chapter_num = chapter_info.get('number')
    
    is_roman = isinstance(start_page, str)
    
    # Build page list
    if is_roman:
        start_idx = list(ROMAN_MAP.keys()).index(start_page)
        end_idx = list(ROMAN_MAP.keys()).index(end_page)
        page_list = list(ROMAN_MAP.keys())[start_idx:end_idx+1]
    else:
        page_list = list(range(start_page, end_page + 1))
    
    lines = [
        "import { BigBookChapter } from '@/types/bigbook-v2';",
        "",
        "/**",
        f" * {title}",
    ]
    
    if chapter_num:
        lines.append(f" * Chapter {chapter_num}")
    
    lines.extend([
        f" * ",
        f" * Pages {start_page}–{end_page}",
        " */",
        "",
        f"export const {chapter_id.replace('-', '_')}: BigBookChapter = {{",
        f"  id: '{chapter_id}',",
    ])
    
    # Escape title
    escaped_title = title.replace("'", "\\'")
    lines.append(f"  title: '{escaped_title}',")
    
    if chapter_num:
        lines.append(f"  chapterNumber: {chapter_num},")
    
    lines.extend([
        f"  pageRange: [{repr(start_page)}, {repr(end_page)}],",
        "  paragraphs: ["
    ])
    
    # Distribute content across pages
    paras_per_page = max(1, len(content) // len(page_list)) if content else 1
    
    for i, para in enumerate(content):
        page_idx = min(i // paras_per_page, len(page_list) - 1)
        page_num = page_list[page_idx]
        
        # Escape content properly
        escaped = (para
                   .replace('\\', '\\\\')
                   .replace("'", "\\'")
                   .replace('\n', ' ')
                   .replace('\r', ''))
        
        page_num_ts = f"'{page_num}'" if isinstance(page_num, str) else str(page_num)
        
        lines.append("    {")
        lines.append(f"      id: '{chapter_id}-p{i+1}',")
        lines.append(f"      chapterId: '{chapter_id}',")
        lines.append(f"      pageNumber: {page_num_ts},")
        lines.append(f"      order: {i+1},")
        lines.append(f"      content: '{escaped}',")
        lines.append("    }," if i < len(content) - 1 else "    }")
    
    lines.extend([
        "  ],",
        "};",
        ""
    ])
    
    return '\n'.join(lines)

def main():
    """Main extraction."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    docx_path = project_root / 'BigBook2.docx'
    output_dir = project_root / 'constants' / 'bigbook-v2' / 'content'
    
    if not docx_path.exists():
        print(f"❌ Word document not found: {docx_path}")
        return
    
    print(f"📖 Reading: {docx_path.name}")
    doc = Document(str(docx_path))
    
    # Get all paragraphs
    paragraphs = [p.text.strip() for p in doc.paragraphs]
    
    print(f"   ✅ Document has {len(paragraphs)} paragraphs")
    
    print("\n" + "=" * 70)
    print("EXTRACTING CHAPTERS USING BLANK LINE PARAGRAPH BREAKS")
    print("=" * 70)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for chapter_info in CHAPTERS:
        print(f"\n📝 {chapter_info['title']}")
        
        # Extract using blank lines as separators
        content = extract_paragraphs_by_blank_lines(paragraphs, chapter_info['start'], chapter_info['end'])
        
        if not content:
            print(f"   ⚠️  No content extracted")
            continue
        
        print(f"   ✅ Extracted {len(content)} paragraphs")
        
        # Show first paragraph for verification
        if content:
            preview = content[0][:70] + "..." if len(content[0]) > 70 else content[0]
            print(f"   📄 First: {preview}")
        
        # Generate TypeScript
        ts_content = generate_typescript(chapter_info, content)
        
        # Write file
        chapter_id = chapter_info['id']
        output_file = output_dir / f'{chapter_id}.ts'
        output_file.write_text(ts_content, encoding='utf-8')
        print(f"   💾 Written to {output_file.name}")
    
    print("\n" + "=" * 70)
    print("✅ EXTRACTION COMPLETE!")
    print("=" * 70)
    print(f"\n📁 Files in: {output_dir}")
    print()

if __name__ == '__main__':
    main()

