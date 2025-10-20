#!/usr/bin/env python3
"""
Convert original Big Book markdown files to bigbook-v2 TypeScript format.

Uses the clean, well-edited markdown files from the original app version.
Preserves all markdown formatting (italics, bold, tables).
"""

import re
from pathlib import Path
from typing import List, Dict, Optional

# Chapter metadata mapping
CHAPTER_METADATA = {
    'aa-doctors-opinion.md': {
        'id': 'doctors-opinion',
        'title': "The Doctor's Opinion",
        'chapterNumber': 0,
        'pageRange': [23, 30],
        'useRomanNumerals': True,
        'source': '2nd-edition-backup'
    },
    'aa-chapter-1.md': {
        'id': 'chapter-1',
        'title': "Bill's Story",
        'chapterNumber': 1,
        'pageRange': [1, 16]
    },
    'aa-chapter-2.md': {
        'id': 'chapter-2',
        'title': 'There Is a Solution',
        'chapterNumber': 2,
        'pageRange': [17, 29]
    },
    'aa-chapter-3.md': {
        'id': 'chapter-3',
        'title': 'More About Alcoholism',
        'chapterNumber': 3,
        'pageRange': [30, 43]
    },
    'aa-chapter-4.md': {
        'id': 'chapter-4',
        'title': 'We Agnostics',
        'chapterNumber': 4,
        'pageRange': [44, 57]
    },
    'aa-chapter-5.md': {
        'id': 'chapter-5',
        'title': 'How It Works',
        'chapterNumber': 5,
        'pageRange': [58, 71]
    },
    'aa-chapter-6.md': {
        'id': 'chapter-6',
        'title': 'Into Action',
        'chapterNumber': 6,
        'pageRange': [72, 88]
    },
    'aa-chapter-7.md': {
        'id': 'chapter-7',
        'title': 'Working with Others',
        'chapterNumber': 7,
        'pageRange': [89, 103]
    },
    'aa-chapter-8.md': {
        'id': 'chapter-8',
        'title': 'To Wives',
        'chapterNumber': 8,
        'pageRange': [104, 121]
    },
    'aa-chapter-9.md': {
        'id': 'chapter-9',
        'title': 'The Family Afterward',
        'chapterNumber': 9,
        'pageRange': [122, 135]
    },
    'aa-chapter-10.md': {
        'id': 'chapter-10',
        'title': 'To Employers',
        'chapterNumber': 10,
        'pageRange': [136, 150]
    },
    'aa-chapter-11.md': {
        'id': 'chapter-11',
        'title': 'A Vision for You',
        'chapterNumber': 11,
        'pageRange': [151, 164]
    },
    'appendix-spiritual-experience.md': {
        'id': 'appendix-2',
        'title': 'Spiritual Experience',
        'chapterNumber': 12,
        'pageRange': [569, 570]
    }
}

# Roman numeral to integer mapping
ROMAN_MAP = {
    'xxiii': 23, 'xxiv': 24, 'xxv': 25, 'xxvi': 26,
    'xxvii': 27, 'xxviii': 28, 'xxix': 29, 'xxx': 30,
    'xxxi': 31, 'xxxii': 32
}


def is_complete_sentence(text: str) -> bool:
    """Check if text ends with sentence-ending punctuation."""
    text = text.strip()
    if not text:
        return False
    return text[-1] in '.!?:'


def parse_markdown_file(md_file: Path) -> List[Dict]:
    """Parse markdown file and extract paragraphs with page numbers."""
    content = md_file.read_text()
    lines = content.split('\n')
    
    paragraphs = []
    current_page = None
    current_para = None
    
    for line in lines:
        # Check for page markers: *— Page 1 —* or --xxiii--
        page_match = re.match(r'\*—\s*Page\s+(\d+)\s*—\*', line.strip())
        if not page_match:
            page_match = re.match(r'--(\d+|[ivxlcdm]+)--', line.strip())
        
        if page_match:
            # Save previous paragraph if exists
            if current_para and current_page:
                paragraphs.append(current_para)
                current_para = None
            
            # Update current page
            page_str = page_match.group(1)
            if page_str.isdigit():
                current_page = int(page_str)
            else:
                # Roman numeral
                current_page = ROMAN_MAP.get(page_str.lower(), 23)
            continue
        
        # Skip headers, empty lines, and TOC lines
        if (not line.strip() or 
            line.startswith('#') or 
            line.startswith('**Pages') or
            'Table of Contents' in line):
            # Save incomplete paragraph before skipping
            if current_para and current_page:
                paragraphs.append(current_para)
                current_para = None
            continue
        
        # Process text line
        if current_page:
            if current_para:
                # Check if previous paragraph was incomplete
                if not is_complete_sentence(current_para['content']):
                    # Merge continuation with previous paragraph
                    current_para['content'] += ' ' + line.strip()
                    
                    # Check if now complete
                    if is_complete_sentence(current_para['content']):
                        paragraphs.append(current_para)
                        current_para = None
                else:
                    # Previous was complete, save it and start new
                    paragraphs.append(current_para)
                    current_para = {
                        'pageNumber': current_page,
                        'content': line.strip()
                    }
            else:
                # Start new paragraph
                current_para = {
                    'pageNumber': current_page,
                    'content': line.strip()
                }
    
    # Don't forget last paragraph
    if current_para and current_page:
        paragraphs.append(current_para)
    
    return paragraphs


def escape_typescript_string(text: str) -> str:
    """Escape a string for TypeScript while preserving markdown."""
    text = text.replace('\\', '\\\\')
    text = text.replace("'", "\\'")
    # Don't convert newlines - keep as single line with spaces
    return text


def generate_typescript_file(filename: str, metadata: Dict, paragraphs: List[Dict]) -> str:
    """Generate TypeScript file content."""
    lines = [
        "import { BigBookChapter } from '@/types/bigbook-v2';",
        "",
        "/**",
        f" * {metadata['title']}",
        f" * Chapter {metadata['chapterNumber']}",
        " * ",
        f" * Pages {metadata['pageRange'][0]}–{metadata['pageRange'][1]}",
        " */",
        "",
        f"export const {metadata['id'].replace('-', '_')}: BigBookChapter = {{",
        f"  id: '{metadata['id']}',",
        f"  title: '{escape_typescript_string(metadata['title'])}',",
        f"  chapterNumber: {metadata['chapterNumber']},",
        f"  pageRange: [{metadata['pageRange'][0]}, {metadata['pageRange'][1]}],",
        "  paragraphs: [",
    ]
    
    for order, para in enumerate(paragraphs, start=1):
        escaped_content = escape_typescript_string(para['content'])
        lines.append("    {")
        lines.append(f"      id: '{metadata['id']}-p{order}',")
        lines.append(f"      chapterId: '{metadata['id']}',")
        lines.append(f"      pageNumber: {para['pageNumber']},")
        lines.append(f"      order: {order},")
        lines.append(f"      content: '{escaped_content}',")
        lines.append("    },")
    
    lines.append("  ],")
    lines.append("};")
    lines.append("")
    
    return '\n'.join(lines)


def main():
    base_dir = Path(__file__).parent.parent
    chapters_dir = base_dir / 'constants' / 'bigbook' / 'chapters'
    backup_dir = base_dir / 'constants' / 'bigbook' / 'chapters-2nd-edition-backup'
    target_dir = base_dir / 'constants' / 'bigbook-v2' / 'content'
    
    print("\n" + "="*70)
    print("CONVERTING CLEAN MARKDOWN TO TYPESCRIPT")
    print("="*70)
    
    total_chapters = 0
    total_paragraphs = 0
    
    for md_filename, metadata in CHAPTER_METADATA.items():
        # Determine source directory
        if metadata.get('source') == '2nd-edition-backup':
            source_dir = backup_dir
        else:
            source_dir = chapters_dir
        
        md_file = source_dir / md_filename
        
        if not md_file.exists():
            print(f"⚠️  Skipping {md_filename} - file not found in {source_dir.name}")
            continue
        
        print(f"\nProcessing {metadata['title']}...")
        print(f"  Source: {source_dir.name}/{md_filename}")
        
        # Parse markdown
        paragraphs = parse_markdown_file(md_file)
        print(f"  Found {len(paragraphs)} paragraphs")
        
        if len(paragraphs) == 0:
            print(f"  ⚠️  No paragraphs extracted - check file format")
            continue
        
        # Generate TypeScript
        ts_content = generate_typescript_file(md_filename, metadata, paragraphs)
        
        # Determine output filename
        if metadata['chapterNumber'] == 0:
            ts_filename = f"{metadata['id']}.ts"
        elif metadata['chapterNumber'] >= 12:
            ts_filename = f"{metadata['id']}.ts"
        else:
            ts_filename = f"chapter-{metadata['chapterNumber']}.ts"
        
        ts_file = target_dir / ts_filename
        ts_file.write_text(ts_content)
        print(f"  ✅ Written: {ts_filename}")
        
        total_chapters += 1
        total_paragraphs += len(paragraphs)
    
    print("\n" + "="*70)
    print(f"✅ Converted {total_chapters} files with {total_paragraphs} total paragraphs")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
