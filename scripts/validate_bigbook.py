#!/usr/bin/env python3
"""
Big Book Content Validator

Checks for corruption issues in the Big Book content:
- Text mixing between chapters
- Duplicate content
- Missing content
- Page number inconsistencies
"""

import re
from pathlib import Path
from typing import Dict, List, Set

def parse_typescript_chapter(file_path: Path) -> Dict:
    """Parse a TypeScript chapter file to extract content."""
    content = file_path.read_text(encoding='utf-8')
    
    # Extract chapter ID
    chapter_id_match = re.search(r"id: '([^']+)'", content)
    chapter_id = chapter_id_match.group(1) if chapter_id_match else None
    
    # Extract all paragraphs
    paragraphs = []
    paragraph_pattern = r"\{[^}]*id: '([^']+)'[^}]*chapterId: '([^']+)'[^}]*pageNumber: (\d+)[^}]*order: (\d+)[^}]*content: '([^']*?)'[^}]*\}"
    
    for match in re.finditer(paragraph_pattern, content, re.DOTALL):
        para_id, chapter_id_in_para, page_num, order, text = match.groups()
        paragraphs.append({
            'id': para_id,
            'chapterId': chapter_id_in_para,
            'pageNumber': int(page_num),
            'order': int(order),
            'content': text,
        })
    
    return {
        'chapter_id': chapter_id,
        'file_path': file_path,
        'paragraphs': paragraphs,
    }

def check_content_uniqueness(chapters: List[Dict]) -> List[str]:
    """Check for duplicate content across chapters."""
    issues = []
    content_map: Dict[str, List[str]] = {}
    
    for chapter in chapters:
        for para in chapter['paragraphs']:
            content = para['content'].strip()
            if len(content) < 50:  # Skip very short paragraphs
                continue
            
            # Use first 100 chars as key
            key = content[:100]
            if key not in content_map:
                content_map[key] = []
            content_map[key].append(f"{chapter['chapter_id']} (p{para['order']})")
    
    # Find duplicates
    for key, locations in content_map.items():
        if len(locations) > 1:
            issues.append(f"Duplicate content found in: {', '.join(locations)}")
            issues.append(f"  Content: {key}...")
    
    return issues

def check_page_number_consistency(chapters: List[Dict]) -> List[str]:
    """Check for page number issues."""
    issues = []
    
    for chapter in chapters:
        paragraphs = chapter['paragraphs']
        if not paragraphs:
            continue
        
        # Check if page numbers are sequential or at least reasonable
        page_numbers = [p['pageNumber'] for p in paragraphs]
        min_page = min(page_numbers)
        max_page = max(page_numbers)
        
        # Check for suspicious jumps
        sorted_pages = sorted(set(page_numbers))
        for i in range(len(sorted_pages) - 1):
            diff = sorted_pages[i + 1] - sorted_pages[i]
            if diff > 5:  # Suspicious jump
                issues.append(
                    f"{chapter['chapter_id']}: Large page jump from "
                    f"{sorted_pages[i]} to {sorted_pages[i + 1]}"
                )
        
        # Check order consistency
        for i in range(len(paragraphs) - 1):
            if paragraphs[i]['order'] + 1 != paragraphs[i + 1]['order']:
                issues.append(
                    f"{chapter['chapter_id']}: Order gap between "
                    f"p{paragraphs[i]['order']} and p{paragraphs[i + 1]['order']}"
                )
    
    return issues

def check_chapter_id_consistency(chapters: List[Dict]) -> List[str]:
    """Check that paragraph chapter IDs match their file's chapter ID."""
    issues = []
    
    for chapter in chapters:
        chapter_id = chapter['chapter_id']
        for para in chapter['paragraphs']:
            if para['chapterId'] != chapter_id:
                issues.append(
                    f"{chapter['file_path'].name}: Paragraph {para['id']} has "
                    f"chapterId '{para['chapterId']}' but should be '{chapter_id}'"
                )
    
    return issues

def check_for_known_content(chapters: List[Dict]) -> List[str]:
    """Check if chapters contain their expected content."""
    issues = []
    
    # Known content snippets for validation
    expected_content = {
        'chapter-1': 'WAR FEVER ran high',
        'chapter-5': 'Twelve Steps',
        'doctors-opinion': 'William D. Silkworth',
        'chapter-3': 'More About Alcoholism',
    }
    
    for chapter in chapters:
        chapter_id = chapter['chapter_id']
        if chapter_id in expected_content:
            expected = expected_content[chapter_id]
            all_content = ' '.join(p['content'] for p in chapter['paragraphs'])
            if expected not in all_content:
                issues.append(
                    f"{chapter_id}: Expected content '{expected}' not found"
                )
    
    return issues

def main():
    """Run all validation checks."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    content_dir = project_root / 'constants' / 'bigbook-v2' / 'content'
    
    if not content_dir.exists():
        print(f"❌ Content directory not found: {content_dir}")
        return
    
    print("🔍 Loading Big Book content files...\n")
    
    # Parse all chapter files
    chapters = []
    for ts_file in sorted(content_dir.glob('*.ts')):
        if ts_file.name in ['index.ts']:
            continue
        
        print(f"  📖 {ts_file.name}")
        chapter_data = parse_typescript_chapter(ts_file)
        if chapter_data['paragraphs']:
            chapters.append(chapter_data)
            print(f"     Found {len(chapter_data['paragraphs'])} paragraphs")
    
    print(f"\n✅ Loaded {len(chapters)} chapters\n")
    print("=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)
    
    # Run checks
    all_issues = []
    
    print("\n1️⃣  Checking chapter ID consistency...")
    issues = check_chapter_id_consistency(chapters)
    if issues:
        all_issues.extend(issues)
        for issue in issues:
            print(f"   ⚠️  {issue}")
    else:
        print("   ✅ All chapter IDs are consistent")
    
    print("\n2️⃣  Checking page number consistency...")
    issues = check_page_number_consistency(chapters)
    if issues:
        all_issues.extend(issues)
        for issue in issues:
            print(f"   ⚠️  {issue}")
    else:
        print("   ✅ Page numbers look consistent")
    
    print("\n3️⃣  Checking for duplicate content...")
    issues = check_content_uniqueness(chapters)
    if issues:
        all_issues.extend(issues)
        for issue in issues[:20]:  # Limit output
            print(f"   ⚠️  {issue}")
        if len(issues) > 20:
            print(f"   ... and {len(issues) - 20} more duplicates")
    else:
        print("   ✅ No duplicate content found")
    
    print("\n4️⃣  Checking for expected content...")
    issues = check_for_known_content(chapters)
    if issues:
        all_issues.extend(issues)
        for issue in issues:
            print(f"   ⚠️  {issue}")
    else:
        print("   ✅ Expected content found in chapters")
    
    print("\n" + "=" * 70)
    if all_issues:
        print(f"❌ Found {len(all_issues)} issues")
    else:
        print("✅ No issues found - content appears valid!")
    print("=" * 70)

if __name__ == '__main__':
    main()


