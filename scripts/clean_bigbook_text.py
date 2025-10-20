#!/usr/bin/env python3
"""
Clean Big Book Text Extraction Script

Matches corrupted TypeScript chapter files with clean text from aa.txt,
transferring page numbers while using clean content.
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from difflib import SequenceMatcher

# Chapter boundaries in aa.txt (line numbers from grep output)
CHAPTER_LINES = {
    1: 16,    # Chapter 1
    2: 96,    # Chapter 2
    3: 153,   # Chapter 3
    4: 199,   # Chapter 4
    5: 253,   # Chapter 5
    6: 343,   # Chapter 6
    7: 400,   # Chapter 7
    8: 454,   # Chapter 8
    9: 522,   # Chapter 9
    10: 574,  # Chapter 10
    11: 630,  # Chapter 11
}

CHAPTER_METADATA = {
    1: {'id': 'chapter-1', 'title': "Bill's Story", 'pageRange': [1, 16]},
    2: {'id': 'chapter-2', 'title': 'There Is a Solution', 'pageRange': [17, 29]},
    3: {'id': 'chapter-3', 'title': 'More About Alcoholism', 'pageRange': [30, 43]},
    4: {'id': 'chapter-4', 'title': 'We Agnostics', 'pageRange': [44, 57]},
    5: {'id': 'chapter-5', 'title': 'How It Works', 'pageRange': [58, 71]},
    6: {'id': 'chapter-6', 'title': 'Into Action', 'pageRange': [72, 88]},
    7: {'id': 'chapter-7', 'title': 'Working with Others', 'pageRange': [89, 103]},
    8: {'id': 'chapter-8', 'title': 'To Wives', 'pageRange': [104, 121]},
    9: {'id': 'chapter-9', 'title': 'The Family Afterward', 'pageRange': [122, 135]},
    10: {'id': 'chapter-10', 'title': 'To Employers', 'pageRange': [136, 150]},
    11: {'id': 'chapter-11', 'title': 'A Vision for You', 'pageRange': [151, 164]},
}


def normalize_text(text: str) -> str:
    """Normalize text for fuzzy matching."""
    # Lowercase
    text = text.lower()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove punctuation (keep letters and spaces only)
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()


def similarity_score(text1: str, text2: str) -> float:
    """Calculate similarity between two texts (0.0 to 1.0)."""
    norm1 = normalize_text(text1)
    norm2 = normalize_text(text2)
    return SequenceMatcher(None, norm1, norm2).ratio()


def parse_clean_chapters(txt_file: Path) -> Dict[int, List[str]]:
    """Parse aa.txt into chapters with paragraphs."""
    print("\n" + "="*70)
    print("STEP 1: Parsing clean text file")
    print("="*70)
    
    lines = txt_file.read_text().split('\n')
    chapters = {}
    
    for chapter_num in range(1, 12):
        start_line = CHAPTER_LINES[chapter_num]
        end_line = CHAPTER_LINES.get(chapter_num + 1, len(lines))
        
        # Extract chapter lines (skip header lines)
        chapter_lines = lines[start_line:end_line]
        
        # Skip first 3 lines (Chapter N header, blank, title)
        if len(chapter_lines) > 3:
            chapter_lines = chapter_lines[3:]
        
        # Parse paragraphs - each indented line is a separate paragraph
        paragraphs = []
        
        for line in chapter_lines:
            # Skip blank lines
            if not line.strip():
                continue
            
            # Skip lines that are just whitespace or chapter markers
            stripped = line.strip()
            if not stripped or stripped.startswith('Chapter '):
                continue
            
            # Each indented line (starting with spaces) is a paragraph
            # Lines with significant indentation (like poetry) might not have leading spaces
            # but they should still be individual paragraphs
            if line.startswith('    ') or line.startswith('\t') or (stripped and len(stripped) > 10):
                paragraphs.append(stripped)
        
        chapters[chapter_num] = paragraphs
        print(f"  Chapter {chapter_num}: {len(paragraphs)} paragraphs")
    
    return chapters


def parse_corrupted_chapter(ts_file: Path) -> List[Dict]:
    """Extract paragraphs from corrupted TypeScript file."""
    content = ts_file.read_text()
    
    paragraphs = []
    
    # Find all paragraph objects in the TypeScript file
    # Pattern: { id: '...', chapterId: '...', pageNumber: N, order: N, content: '...' }
    pattern = r"\{\s*id:\s*'([^']+)',\s*chapterId:\s*'([^']+)',\s*pageNumber:\s*(\d+),\s*order:\s*(\d+),\s*content:\s*'((?:[^'\\]|\\.)*)'"
    
    matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
    
    for match in matches:
        para_id = match.group(1)
        chapter_id = match.group(2)
        page_num = int(match.group(3))
        order = int(match.group(4))
        para_content = match.group(5)
        
        # Unescape the content
        para_content = para_content.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n')
        
        paragraphs.append({
            'id': para_id,
            'chapterId': chapter_id,
            'pageNumber': page_num,
            'order': order,
            'content': para_content
        })
    
    return paragraphs


def match_paragraphs(clean_paras: List[str], corrupted_paras: List[Dict], chapter_num: int) -> List[Dict]:
    """Match corrupted paragraphs to clean ones and transfer page numbers."""
    print(f"\n  Chapter {chapter_num}: Matching {len(corrupted_paras)} corrupted → {len(clean_paras)} clean")
    
    matched = []
    used_clean_indices = set()
    
    for i, corrupted in enumerate(corrupted_paras):
        best_match_idx = None
        best_score = 0.0
        
        # Find best matching clean paragraph
        for j, clean_para in enumerate(clean_paras):
            if j in used_clean_indices:
                continue
            
            score = similarity_score(corrupted['content'], clean_para)
            
            if score > best_score:
                best_score = score
                best_match_idx = j
        
        # If good match found (>= 70% similarity)
        if best_match_idx is not None and best_score >= 0.70:
            matched.append({
                'pageNumber': corrupted['pageNumber'],
                'order': corrupted['order'],
                'content': clean_paras[best_match_idx],
                'similarity': best_score
            })
            used_clean_indices.add(best_match_idx)
            
            if best_score < 0.95:
                print(f"    Para {i+1}: {best_score:.2%} match (possible corruption fixed)")
        else:
            # No good match - keep corrupted version but warn
            print(f"    ⚠️  Para {i+1}: No match found (score: {best_score:.2%}), keeping original")
            matched.append({
                'pageNumber': corrupted['pageNumber'],
                'order': corrupted['order'],
                'content': corrupted['content'],
                'similarity': 0.0
            })
    
    return matched


def escape_typescript_string(text: str) -> str:
    """Escape a string for TypeScript."""
    # Escape backslashes first
    text = text.replace('\\', '\\\\')
    # Escape single quotes
    text = text.replace("'", "\\'")
    # Escape newlines
    text = text.replace('\n', '\\n')
    return text


def generate_typescript_file(chapter_num: int, matched_paras: List[Dict]) -> str:
    """Generate TypeScript file content."""
    meta = CHAPTER_METADATA[chapter_num]
    
    lines = [
        "import { BigBookChapter } from '@/types/bigbook-v2';",
        "",
        "/**",
        f" * {meta['title']}",
        f" * Chapter {chapter_num}",
        " * ",
        f" * Pages {meta['pageRange'][0]}–{meta['pageRange'][1]}",
        " */",
        "",
        f"export const chapter_{chapter_num}: BigBookChapter = {{",
        f"  id: '{meta['id']}',",
        f"  title: '{escape_typescript_string(meta['title'])}',",
        f"  chapterNumber: {chapter_num},",
        f"  pageRange: [{meta['pageRange'][0]}, {meta['pageRange'][1]}],",
        "  paragraphs: [",
    ]
    
    for para in matched_paras:
        escaped_content = escape_typescript_string(para['content'])
        lines.append("    {")
        lines.append(f"      id: '{meta['id']}-p{para['order']}',")
        lines.append(f"      chapterId: '{meta['id']}',")
        lines.append(f"      pageNumber: {para['pageNumber']},")
        lines.append(f"      order: {para['order']},")
        lines.append(f"      content: '{escaped_content}',")
        lines.append("    },")
    
    lines.append("  ],")
    lines.append("};")
    lines.append("")
    
    return '\n'.join(lines)


def validate_chapter(chapter_num: int, matched_paras: List[Dict]) -> bool:
    """Validate chapter data."""
    if not matched_paras:
        print(f"  ❌ Chapter {chapter_num}: No paragraphs!")
        return False
    
    # Check page numbers are reasonable
    page_nums = [p['pageNumber'] for p in matched_paras]
    min_page = min(page_nums)
    max_page = max(page_nums)
    expected_range = CHAPTER_METADATA[chapter_num]['pageRange']
    
    if min_page != expected_range[0]:
        print(f"  ⚠️  Chapter {chapter_num}: First page {min_page} != expected {expected_range[0]}")
    
    if max_page != expected_range[1]:
        print(f"  ⚠️  Chapter {chapter_num}: Last page {max_page} != expected {expected_range[1]}")
    
    # Check for corruption artifacts in clean text
    corruption_found = False
    for i, para in enumerate(matched_paras):
        content = para['content']
        
        # Check for split words with spaces
        if re.search(r'\b\w\s+\w{2,}\b', content):
            if 'w arnings' in content or 'o f' in content.lower():
                print(f"  ❌ Chapter {chapter_num} para {i+1}: Found corruption artifact (split words)")
                corruption_found = True
        
        # Check for word-breaking hyphens
        if re.search(r'[a-z]-\s+[a-z]', content):
            print(f"  ❌ Chapter {chapter_num} para {i+1}: Found hyphenation artifact")
            corruption_found = True
    
    if not corruption_found:
        print(f"  ✅ Chapter {chapter_num}: {len(matched_paras)} paragraphs, pages {min_page}-{max_page}")
    
    return not corruption_found


def main():
    base_dir = Path(__file__).parent.parent
    txt_file = base_dir / 'aa.txt'
    content_dir = base_dir / 'constants' / 'bigbook-v2' / 'content'
    
    print("\n" + "="*70)
    print("BIG BOOK TEXT CLEANING SCRIPT")
    print("="*70)
    
    # Step 1: Parse clean text
    clean_chapters = parse_clean_chapters(txt_file)
    
    # Step 2-5: Process each chapter
    print("\n" + "="*70)
    print("STEP 2-4: Load, Match, and Generate")
    print("="*70)
    
    for chapter_num in range(1, 12):
        print(f"\nProcessing Chapter {chapter_num}...")
        
        # Load corrupted file
        ts_file = content_dir / f'chapter-{chapter_num}.ts'
        if not ts_file.exists():
            print(f"  ❌ File not found: {ts_file}")
            continue
        
        corrupted_paras = parse_corrupted_chapter(ts_file)
        print(f"  Loaded {len(corrupted_paras)} corrupted paragraphs")
        
        # Match paragraphs
        clean_paras = clean_chapters[chapter_num]
        matched_paras = match_paragraphs(clean_paras, corrupted_paras, chapter_num)
        
        # Generate new TypeScript file
        ts_content = generate_typescript_file(chapter_num, matched_paras)
        
        # Write file
        ts_file.write_text(ts_content)
        print(f"  ✅ Written: {ts_file.name}")
    
    # Step 5: Validation
    print("\n" + "="*70)
    print("STEP 5: Validation")
    print("="*70)
    
    all_valid = True
    for chapter_num in range(1, 12):
        ts_file = content_dir / f'chapter-{chapter_num}.ts'
        corrupted_paras = parse_corrupted_chapter(ts_file)
        if not validate_chapter(chapter_num, corrupted_paras):
            all_valid = False
    
    print("\n" + "="*70)
    if all_valid:
        print("✅ ALL CHAPTERS CLEANED SUCCESSFULLY!")
    else:
        print("⚠️  Some validation warnings - please review")
    print("="*70)
    print()


if __name__ == '__main__':
    main()

