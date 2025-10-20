#!/usr/bin/env python3
"""
Fix mid-sentence paragraph starts in Big Book chapters.

Merges paragraphs that start with lowercase letters into the previous paragraph,
as they are artificially split mid-sentence.
"""

import re
from pathlib import Path
from typing import List, Dict

def is_mid_sentence_start(text: str) -> bool:
    """Check if paragraph starts mid-sentence (lowercase first letter)."""
    # Skip empty or very short paragraphs
    if len(text.strip()) < 10:
        return False
    
    # Get first word (skip quotes, special chars)
    first_word_match = re.match(r'^["\']?\s*(\w+)', text)
    if not first_word_match:
        return False
    
    first_letter = first_word_match.group(1)[0]
    return first_letter.islower()


def merge_split_paragraphs(paragraphs: List[Dict]) -> List[Dict]:
    """Merge paragraphs that start mid-sentence with previous paragraph."""
    merged = []
    i = 0
    
    while i < len(paragraphs):
        current = paragraphs[i]
        
        # Check if next paragraph(s) should be merged
        merged_content = current['content']
        merged_count = 0
        
        while i + 1 < len(paragraphs):
            next_para = paragraphs[i + 1]
            
            # Only merge if:
            # 1. Next paragraph starts mid-sentence
            # 2. They're on the same page or consecutive pages
            # 3. Next paragraph's order is sequential
            if (is_mid_sentence_start(next_para['content']) and
                abs(next_para['pageNumber'] - current['pageNumber']) <= 1 and
                next_para['order'] == current['order'] + merged_count + 1):
                
                # Merge with a space
                merged_content += ' ' + next_para['content']
                merged_count += 1
                i += 1
            else:
                break
        
        # Add the merged paragraph
        merged.append({
            'id': current['id'],
            'pageNumber': current['pageNumber'],
            'order': current['order'],
            'content': merged_content
        })
        
        i += 1
    
    return merged


def parse_chapter_file(ts_file: Path) -> tuple:
    """Parse TypeScript file and extract metadata and paragraphs."""
    content = ts_file.read_text()
    
    # Extract chapter metadata
    chapter_id_match = re.search(r"id:\s*'([^']+)'", content)
    title_match = re.search(r"title:\s*'([^']+)'", content)
    chapter_num_match = re.search(r"chapterNumber:\s*(\d+)", content)
    page_range_match = re.search(r"pageRange:\s*\[(\d+),\s*(\d+)\]", content)
    
    metadata = {
        'id': chapter_id_match.group(1) if chapter_id_match else '',
        'title': title_match.group(1).replace("\\'", "'") if title_match else '',
        'chapterNumber': int(chapter_num_match.group(1)) if chapter_num_match else 0,
        'pageRange': [int(page_range_match.group(1)), int(page_range_match.group(2))] if page_range_match else [0, 0]
    }
    
    # Extract paragraphs
    paragraphs = []
    pattern = r"\{\s*id:\s*'([^']+)',\s*chapterId:\s*'([^']+)',\s*pageNumber:\s*(\d+),\s*order:\s*(\d+),\s*content:\s*'((?:[^'\\]|\\.)*)'"
    
    for match in re.finditer(pattern, content, re.MULTILINE | re.DOTALL):
        para_id = match.group(1)
        page_num = int(match.group(3))
        order = int(match.group(4))
        para_content = match.group(5)
        
        # Unescape the content
        para_content = para_content.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n')
        
        paragraphs.append({
            'id': para_id,
            'pageNumber': page_num,
            'order': order,
            'content': para_content
        })
    
    return metadata, paragraphs


def escape_typescript_string(text: str) -> str:
    """Escape a string for TypeScript."""
    text = text.replace('\\', '\\\\')
    text = text.replace("'", "\\'")
    text = text.replace('\n', '\\n')
    return text


def generate_typescript_file(metadata: Dict, paragraphs: List[Dict]) -> str:
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
        f"export const chapter_{metadata['chapterNumber']}: BigBookChapter = {{",
        f"  id: '{metadata['id']}',",
        f"  title: '{escape_typescript_string(metadata['title'])}',",
        f"  chapterNumber: {metadata['chapterNumber']},",
        f"  pageRange: [{metadata['pageRange'][0]}, {metadata['pageRange'][1]}],",
        "  paragraphs: [",
    ]
    
    for para in paragraphs:
        escaped_content = escape_typescript_string(para['content'])
        lines.append("    {")
        lines.append(f"      id: '{para['id']}',")
        lines.append(f"      chapterId: '{metadata['id']}',")
        lines.append(f"      pageNumber: {para['pageNumber']},")
        lines.append(f"      order: {para['order']},")
        lines.append(f"      content: '{escaped_content}',")
        lines.append("    },")
    
    lines.append("  ],")
    lines.append("};")
    lines.append("")
    
    return '\n'.join(lines)


def main():
    base_dir = Path(__file__).parent.parent
    content_dir = base_dir / 'constants' / 'bigbook-v2' / 'content'
    
    print("\n" + "="*70)
    print("FIXING MID-SENTENCE PARAGRAPH SPLITS")
    print("="*70)
    
    total_before = 0
    total_after = 0
    total_merged = 0
    
    for chapter_num in range(1, 12):
        ts_file = content_dir / f'chapter-{chapter_num}.ts'
        
        # Parse existing file
        metadata, paragraphs = parse_chapter_file(ts_file)
        total_before += len(paragraphs)
        
        # Merge split paragraphs
        merged_paragraphs = merge_split_paragraphs(paragraphs)
        total_after += len(merged_paragraphs)
        merged_count = len(paragraphs) - len(merged_paragraphs)
        total_merged += merged_count
        
        if merged_count > 0:
            print(f"Chapter {chapter_num}: {len(paragraphs)} → {len(merged_paragraphs)} paragraphs ({merged_count} merged)")
        
        # Generate new file
        ts_content = generate_typescript_file(metadata, merged_paragraphs)
        ts_file.write_text(ts_content)
    
    print("="*70)
    print(f"Total: {total_before} → {total_after} paragraphs ({total_merged} merged)")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()

