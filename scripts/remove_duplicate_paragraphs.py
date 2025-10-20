#!/usr/bin/env python3
"""
Remove duplicate paragraphs that are substrings of previous paragraphs.

This happens when a clean full paragraph replaces a corrupted split paragraph,
but the second half of the split paragraph remains as a separate entry.
"""

import re
from pathlib import Path
from typing import List, Dict

def is_duplicate_substring(para: Dict, previous_paras: List[Dict]) -> bool:
    """Check if paragraph is a substring of any recent previous paragraph."""
    # Normalize both texts for comparison
    para_text = para['content'].lower().replace('\n', ' ').strip()
    
    # Check last 5 paragraphs (duplicates are usually adjacent or very close)
    for prev in previous_paras[-5:]:
        prev_text = prev['content'].lower().replace('\n', ' ').strip()
        
        # Check if current paragraph is a substring of previous
        if len(para_text) > 20 and para_text in prev_text:
            return True
        
        # Also check if previous is a substring of current (reverse case)
        if len(prev_text) > 20 and prev_text in para_text:
            # Mark previous as the duplicate instead
            return False
    
    return False


def remove_duplicates(paragraphs: List[Dict]) -> List[Dict]:
    """Remove paragraphs that are duplicates (substrings of previous paragraphs)."""
    deduplicated = []
    removed_indices = set()
    
    for i, para in enumerate(paragraphs):
        # Skip if already marked for removal
        if i in removed_indices:
            continue
        
        # Check if this is a duplicate
        if is_duplicate_substring(para, deduplicated):
            print(f"  Removing duplicate para {para['order']} (page {para['pageNumber']}): {para['content'][:60]}...")
            continue
        
        # Check if any previous paragraphs should be removed because current is fuller
        for j, prev in enumerate(deduplicated):
            prev_text = prev['content'].lower().replace('\n', ' ').strip()
            para_text = para['content'].lower().replace('\n', ' ').strip()
            
            if len(prev_text) > 20 and prev_text in para_text:
                print(f"  Replacing shorter para {prev['order']} with fuller para {para['order']}")
                deduplicated[j] = para
                removed_indices.add(i)
                break
        else:
            # No replacement needed, add to list
            deduplicated.append(para)
    
    return deduplicated


def renumber_orders(paragraphs: List[Dict]) -> List[Dict]:
    """Renumber paragraph orders to be sequential."""
    for i, para in enumerate(paragraphs, start=1):
        para['order'] = i
        # Update ID to match new order
        para['id'] = re.sub(r'-p\d+$', f'-p{i}', para['id'])
    return paragraphs


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
    print("REMOVING DUPLICATE PARAGRAPHS")
    print("="*70)
    
    total_before = 0
    total_after = 0
    total_removed = 0
    
    for chapter_num in range(1, 12):
        ts_file = content_dir / f'chapter-{chapter_num}.ts'
        
        print(f"\nChapter {chapter_num}:")
        
        # Parse existing file
        metadata, paragraphs = parse_chapter_file(ts_file)
        total_before += len(paragraphs)
        
        # Remove duplicates
        deduplicated = remove_duplicates(paragraphs)
        
        # Renumber orders
        deduplicated = renumber_orders(deduplicated)
        
        total_after += len(deduplicated)
        removed_count = len(paragraphs) - len(deduplicated)
        total_removed += removed_count
        
        print(f"  {len(paragraphs)} → {len(deduplicated)} paragraphs ({removed_count} removed)")
        
        # Generate new file
        ts_content = generate_typescript_file(metadata, deduplicated)
        ts_file.write_text(ts_content)
    
    print("\n" + "="*70)
    print(f"Total: {total_before} → {total_after} paragraphs ({total_removed} removed)")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()

