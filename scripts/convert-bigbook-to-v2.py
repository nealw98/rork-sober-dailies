#!/usr/bin/env python3

"""
Big Book Markdown to TypeScript Converter

Converts 2nd edition markdown files to structured TypeScript format
with automatic paragraph ID generation.

Usage: python3 scripts/convert-bigbook-to-v2.py
"""

import os
import re
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR.parent / 'constants' / 'bigbook' / 'chapters-2nd-edition-backup'
OUTPUT_DIR = SCRIPT_DIR.parent / 'constants' / 'bigbook-v2' / 'content'

# Mapping of input files to output format
FILE_MAPPINGS = [
    {'input': 'aa-foreword-first.md', 'chapterId': 'foreword-first', 'title': 'Foreword to First Edition', 'pageRange': [13, 14]},
    {'input': 'aa-foreword-second.md', 'chapterId': 'foreword-second', 'title': 'Foreword to Second Edition', 'pageRange': [15, 18]},
    {'input': 'aa-preface.md', 'chapterId': 'preface', 'title': 'Preface', 'pageRange': [19, 22]},
    {'input': 'aa-doctors-opinion.md', 'chapterId': 'doctors-opinion', 'title': "The Doctor's Opinion", 'pageRange': [23, 32]},
    {'input': 'aa-chapter-01-bills-story.md', 'chapterId': 'chapter-1', 'title': "Bill's Story", 'chapterNumber': 1, 'pageRange': [1, 16]},
    {'input': 'aa-chapter-02-there-is-a-solution.md', 'chapterId': 'chapter-2', 'title': 'There Is a Solution', 'chapterNumber': 2, 'pageRange': [17, 29]},
    {'input': 'aa-chapter-03-more-about-alcoholism.md', 'chapterId': 'chapter-3', 'title': 'More About Alcoholism', 'chapterNumber': 3, 'pageRange': [30, 43]},
    {'input': 'aa-chapter-04-we-agnostics.md', 'chapterId': 'chapter-4', 'title': 'We Agnostics', 'chapterNumber': 4, 'pageRange': [44, 57]},
    {'input': 'aa-chapter-05-how-it-works.md', 'chapterId': 'chapter-5', 'title': 'How It Works', 'chapterNumber': 5, 'pageRange': [58, 71]},
    {'input': 'aa-chapter-06-into-action.md', 'chapterId': 'chapter-6', 'title': 'Into Action', 'chapterNumber': 6, 'pageRange': [72, 88]},
    {'input': 'aa-chapter-07-working-with-others.md', 'chapterId': 'chapter-7', 'title': 'Working with Others', 'chapterNumber': 7, 'pageRange': [89, 103]},
    {'input': 'aa-chapter-08-to_wives.md', 'chapterId': 'chapter-8', 'title': 'To Wives', 'chapterNumber': 8, 'pageRange': [104, 121]},
    {'input': 'aa-chapter-09-the-family-afterward.md', 'chapterId': 'chapter-9', 'title': 'The Family Afterward', 'chapterNumber': 9, 'pageRange': [122, 135]},
    {'input': 'aa-chapter-10-to-employers.md', 'chapterId': 'chapter-10', 'title': 'To Employers', 'chapterNumber': 10, 'pageRange': [136, 150]},
    {'input': 'aa-chapter-11-a-vision-for-you.md', 'chapterId': 'chapter-11', 'title': 'A Vision for You', 'chapterNumber': 11, 'pageRange': [151, 164]},
    {'input': 'appendix-01.md', 'chapterId': 'appendix-1', 'title': 'The AA Tradition', 'pageRange': [565, 568]},
    {'input': 'appendix-02.md', 'chapterId': 'appendix-2', 'title': 'Spiritual Experience', 'pageRange': [569, 570]},
    {'input': 'appendix-03.md', 'chapterId': 'appendix-3', 'title': 'The Medical View on AA', 'pageRange': [571, 572]},
    {'input': 'appendix-04.md', 'chapterId': 'appendix-4', 'title': 'The Lasker Award', 'pageRange': [573, 574]},
    {'input': 'appendix-05.md', 'chapterId': 'appendix-5', 'title': 'The Religious View on AA', 'pageRange': [575, 577]},
    {'input': 'appendix-06.md', 'chapterId': 'appendix-6', 'title': 'How to Get in Touch with AA', 'pageRange': [578, 579]},
]

# Roman numeral to Arabic conversion
ROMAN_MAP = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
    'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20,
    'xxi': 21, 'xxii': 22, 'xxiii': 23, 'xxiv': 24, 'xxv': 25,
    'xxvi': 26, 'xxvii': 27, 'xxviii': 28, 'xxix': 29, 'xxx': 30,
    'xxxi': 31, 'xxxii': 32,
}

def parse_page_marker(line):
    """Parse page marker from markdown"""
    # Match patterns like "--1--", "--xxv--", "--- *Page 1* ---"
    patterns = [
        r'--(\d+|[ivxlcdm]+)--',
        r'---\s*\*?Page\s+(\d+)\*?\s*---',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            page_str = match.group(1).lower()
            # Try to convert from Roman numeral
            if page_str in ROMAN_MAP:
                return ROMAN_MAP[page_str]
            # Try to convert from Arabic number
            if page_str.isdigit():
                return int(page_str)
    
    return None

def clean_content(text):
    """Clean and normalize paragraph content"""
    text = text.strip()
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    # Fix encoding issues
    text = text.replace('â€"', '—')
    text = text.replace('â€™', "'")
    text = text.replace('â€œ', '"')
    text = text.replace('â€\u009d', '"')
    return text

def convert_markdown_to_ts(file_path, config):
    """Convert markdown file to TypeScript structured format"""
    print(f"\nConverting: {config['input']}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    paragraphs = []
    current_page = config['pageRange'][0]
    current_paragraph = ''
    paragraph_count = 0
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Skip markdown headers
        if line.startswith('#'):
            continue
        
        # Check for page markers
        page_num = parse_page_marker(line)
        if page_num is not None:
            # Save current paragraph if exists
            if current_paragraph:
                paragraph_count += 1
                paragraphs.append({
                    'id': f"{config['chapterId']}-p{paragraph_count}",
                    'chapterId': config['chapterId'],
                    'pageNumber': current_page,
                    'order': paragraph_count,
                    'content': clean_content(current_paragraph),
                })
                current_paragraph = ''
            
            # Update current page
            current_page = page_num
            continue
        
        # Skip page range indicators
        if re.search(r'\*\*Pages?\s+[\d\-]+\*\*', line, re.IGNORECASE):
            continue
        
        # If line looks like a new paragraph, save previous
        if current_paragraph and not re.match(r'^[a-z]', line):
            paragraph_count += 1
            paragraphs.append({
                'id': f"{config['chapterId']}-p{paragraph_count}",
                'chapterId': config['chapterId'],
                'pageNumber': current_page,
                'order': paragraph_count,
                'content': clean_content(current_paragraph),
            })
            current_paragraph = line
        else:
            # Continue building current paragraph
            current_paragraph += (' ' if current_paragraph else '') + line
    
    # Save final paragraph
    if current_paragraph:
        paragraph_count += 1
        paragraphs.append({
            'id': f"{config['chapterId']}-p{paragraph_count}",
            'chapterId': config['chapterId'],
            'pageNumber': current_page,
            'order': paragraph_count,
            'content': clean_content(current_paragraph),
        })
    
    print(f"  ✓ Extracted {len(paragraphs)} paragraphs")
    
    return {
        'id': config['chapterId'],
        'title': config['title'],
        'chapterNumber': config.get('chapterNumber'),
        'pageRange': config['pageRange'],
        'paragraphs': paragraphs,
    }

def escape_string(s):
    """Escape string for TypeScript"""
    s = s.replace('\\', '\\\\')
    s = s.replace("'", "\\'")
    s = s.replace('\n', '\\n')
    return s

def generate_ts_file(chapter):
    """Generate TypeScript file content"""
    chapter_number_line = f"  chapterNumber: {chapter['chapterNumber']},\n" if chapter.get('chapterNumber') else ''
    
    paragraphs_code = []
    for p in chapter['paragraphs']:
        escaped_content = escape_string(p['content'])
        paragraphs_code.append(f"""    {{
      id: '{p['id']}',
      chapterId: '{p['chapterId']}',
      pageNumber: {p['pageNumber']},
      order: {p['order']},
      content: '{escaped_content}',
    }}""")
    
    paragraphs_str = ',\n'.join(paragraphs_code)
    var_name = chapter['id'].replace('-', '_')
    
    return f"""import {{ BigBookChapter }} from '@/types/bigbook-v2';

/**
 * {chapter['title']}
 * {f"Chapter {chapter['chapterNumber']}" if chapter.get('chapterNumber') else ''}
 * Pages {chapter['pageRange'][0]}-{chapter['pageRange'][1]}
 */

export const {var_name}: BigBookChapter = {{
  id: '{chapter['id']}',
  title: '{escape_string(chapter['title'])}',
{chapter_number_line}  pageRange: [{chapter['pageRange'][0]}, {chapter['pageRange'][1]}],
  paragraphs: [
{paragraphs_str}
  ],
}};
"""

def generate_index_file(mappings):
    """Generate index.ts file that exports all chapters"""
    imports = []
    exports = []
    
    for m in mappings:
        var_name = m['chapterId'].replace('-', '_')
        imports.append(f"import {{ {var_name} }} from './{m['chapterId']}';")
        exports.append(f"  '{m['chapterId']}': {var_name},")
    
    imports_str = '\n'.join(imports)
    exports_str = '\n'.join(exports)
    
    return f"""/**
 * Big Book V2 Content Index
 * 
 * Exports all chapters in structured format.
 */

import {{ BigBookChapter }} from '@/types/bigbook-v2';

{imports_str}

export const bigBookContent: Record<string, BigBookChapter> = {{
{exports_str}
}};

/**
 * Get a specific chapter by ID
 */
export function getChapter(chapterId: string): BigBookChapter | undefined {{
  return bigBookContent[chapterId];
}}

/**
 * Get all chapters as an array
 */
export function getAllChapters(): BigBookChapter[] {{
  return Object.values(bigBookContent);
}}
"""

def main():
    """Main conversion process"""
    print('Big Book Markdown to TypeScript Converter')
    print('==========================================\n')
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Output directory: {OUTPUT_DIR}\n')
    
    success_count = 0
    error_count = 0
    converted_mappings = []
    
    # Convert each file
    for mapping in FILE_MAPPINGS:
        input_path = INPUT_DIR / mapping['input']
        output_file_name = f"{mapping['chapterId']}.ts"
        output_path = OUTPUT_DIR / output_file_name
        
        try:
            if not input_path.exists():
                print(f"⚠ Skipping {mapping['input']} (file not found)")
                continue
            
            chapter = convert_markdown_to_ts(input_path, mapping)
            ts_code = generate_ts_file(chapter)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(ts_code)
            
            print(f"  ✓ Saved to: {output_file_name}")
            success_count += 1
            converted_mappings.append(mapping)
            
        except Exception as error:
            print(f"  ✗ Error converting {mapping['input']}: {error}")
            error_count += 1
    
    # Generate index file
    if converted_mappings:
        print('\nGenerating index file...')
        index_content = generate_index_file(converted_mappings)
        with open(OUTPUT_DIR / 'index.ts', 'w', encoding='utf-8') as f:
            f.write(index_content)
        print('  ✓ Created index.ts')
    
    # Summary
    print('\n==========================================')
    print('Conversion complete!')
    print(f'  Success: {success_count} files')
    print(f'  Errors: {error_count} files')
    print(f'  Output: {OUTPUT_DIR}')

if __name__ == '__main__':
    main()

