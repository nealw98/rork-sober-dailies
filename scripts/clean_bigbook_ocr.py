#!/usr/bin/env python3
"""
Big Book OCR Cleanup

Fixes OCR artifacts in the extracted Big Book content:
- Removes excessive spaces between characters
- Fixes broken words
- Cleans up formatting issues
"""

import re
from pathlib import Path
from typing import List, Dict

def clean_ocr_text(text: str) -> str:
    """Clean OCR artifacts from text."""
    
    # First pass: Fix spaces between letters that clearly shouldn't be there
    # Pattern: lowercase letter + space + 1-2 lowercase letters + space + letter
    for _ in range(3):  # Multiple passes for nested issues
        text = re.sub(r'([a-z])(\s+)([a-z]{1,2})(\s+)([a-z])', r'\1\3\5', text)
    
    # Fix common two-letter combinations with spaces
    text = re.sub(r'\b([a-z])\s+([a-z])\b', r'\1\2', text)
    
    # Fix spaces within common words (more comprehensive list)
    word_patterns = [
        (r'\bAlcoh\s*ol\s*ics', 'Alcoholics'),
        (r'\balcoh\s*ol\s*ics', 'alcoholics'),
        (r'\balcoh\s*ol\s*ic', 'alcoholic'),
        (r'\balcoh\s*ol', 'alcohol'),
        (r'\bAnonym\s*ous', 'Anonymous'),
        (r'\banonym\s*ous', 'anonymous'),
        (r'\bTHE\s+DO\s*CTOR', 'THE DOCTOR'),
        (r'\bThe\s+do\s*ctor', 'The doctor'),
        (r'\bt\s*he\b', 'the'),
        (r'\bw\s*ith\b', 'with'),
        (r'\bw\s*hen\b', 'when'),
        (r'\bw\s*here\b', 'where'),
        (r'\bw\s*hich\b', 'which'),
        (r'\bw\s*hat\b', 'what'),
        (r'\bw\s*ho\b', 'who'),
        (r'\bt\s*his\b', 'this'),
        (r'\bt\s*hat\b', 'that'),
        (r'\bt\s*hrough\b', 'through'),
        (r'\bt\s*heir\b', 'their'),
        (r'\bt\s*here\b', 'there'),
        (r'\bt\s*hese\b', 'these'),
        (r'\bt\s*hose\b', 'those'),
        (r'\bt\s*hen\b', 'then'),
        (r'\bt\s*hey\b', 'they'),
        (r'\bw\s*as\b', 'was'),
        (r'\bw\s*ere\b', 'were'),
        (r'\bw\s*ill\b', 'will'),
        (r'\bw\s*ould\b', 'would'),
        (r'\bc\s*ould\b', 'could'),
        (r'\bs\s*hould\b', 'should'),
        (r'\bf\s*rom\b', 'from'),
        (r'\bf\s*or\b', 'for'),
        (r'\bf\s*ound\b', 'found'),
        (r'\bf\s*eel\b', 'feel'),
        (r'\bf\s*elt\b', 'felt'),
        (r'\bf\s*aith\b', 'faith'),
        (r'\bo\s*ur\b', 'our'),
        (r'\bo\s*f\b', 'of'),
        (r'\bo\s*n\b', 'on'),
        (r'\bo\s*ne\b', 'one'),
        (r'\bo\s*nly\b', 'only'),
        (r'\bo\s*ver\b', 'over'),
        (r'\bo\s*ther\b', 'other'),
        (r'\ba\s*nd\b', 'and'),
        (r'\ba\s*re\b', 'are'),
        (r'\ba\s*ll\b', 'all'),
        (r'\ba\s*ny\b', 'any'),
        (r'\ba\s*bout\b', 'about'),
        (r'\ba\s*fter\b', 'after'),
        (r'\ba\s*lways\b', 'always'),
        (r'\bG\s*od\b', 'God'),
        (r'\bH\s*im\b', 'Him'),
        (r'\bH\s*is\b', 'His'),
        (r'\bH\s*e\b', 'He'),
        (r'\bp\s*ower\b', 'power'),
        (r'\bp\s*eople\b', 'people'),
        (r'\bp\s*rogram\b', 'program'),
        (r'\bd\s*rink\b', 'drink'),
        (r'\bd\s*rinking\b', 'drinking'),
        (r'\bd\s*runk\b', 'drunk'),
        (r'\bs\s*piritual\b', 'spiritual'),
        (r'\bs\s*pirit\b', 'spirit'),
        (r'\be\s*xperience\b', 'experience'),
        (r'\bm\s*ust\b', 'must'),
        (r'\bm\s*ay\b', 'may'),
        (r'\bm\s*an\b', 'man'),
        (r'\bm\s*en\b', 'men'),
        (r'\bm\s*ost\b', 'most'),
        (r'\bm\s*ore\b', 'more'),
        (r'\bm\s*any\b', 'many'),
        (r'\bm\s*ight\b', 'might'),
        (r'\bb\s*ut\b', 'but'),
        (r'\bb\s*een\b', 'been'),
        (r'\bb\s*eing\b', 'being'),
        (r'\bb\s*efore\b', 'before'),
        (r'\bb\s*ecame\b', 'became'),
        (r'\bb\s*ecome\b', 'become'),
        (r'\bb\s*elieve\b', 'believe'),
        (r'\bb\s*elief\b', 'belief'),
        (r'\bh\s*ad\b', 'had'),
        (r'\bh\s*ave\b', 'have'),
        (r'\bh\s*as\b', 'has'),
        (r'\bh\s*ow\b', 'how'),
        (r'\bh\s*owever\b', 'however'),
        (r'\bn\s*ot\b', 'not'),
        (r'\bn\s*ow\b', 'now'),
        (r'\bn\s*ever\b', 'never'),
        (r'\bn\s*eed\b', 'need'),
        (r'\bn\s*ew\b', 'new'),
        (r'\bs\s*ome\b', 'some'),
        (r'\bs\s*aid\b', 'said'),
        (r'\bs\s*aw\b', 'saw'),
        (r'\bs\s*ee\b', 'see'),
        (r'\bs\s*een\b', 'seen'),
        (r'\bi\s*f\b', 'if'),
        (r'\bi\s*t\b', 'it'),
        (r'\bi\s*n\b', 'in'),
        (r'\bi\s*nto\b', 'into'),
        (r'\bi\s*s\b', 'is'),
        (r'\bwa\s*s\b', 'was'),
        (r'\bha\s*d\b', 'had'),
        (r'\bha\s*ve\b', 'have'),
        (r'\bha\s*s\b', 'has'),
        (r'\bno\s*t\b', 'not'),
        (r'\bno\s*w\b', 'now'),
        (r'\bca\s*n\b', 'can'),
        (r'\bca\s*me\b', 'came'),
        (r'\bth\s*is\b', 'this'),
        (r'\bth\s*at\b', 'that'),
        (r'\bth\s*en\b', 'then'),
        (r'\bth\s*ey\b', 'they'),
        (r'\bth\s*eir\b', 'their'),
        (r'\bth\s*ere\b', 'there'),
        (r'\bth\s*ese\b', 'these'),
        (r'\bth\s*ose\b', 'those'),
        (r'\bwh\s*ich\b', 'which'),
        (r'\bwh\s*at\b', 'what'),
        (r'\bwh\s*en\b', 'when'),
        (r'\bwh\s*ere\b', 'where'),
        (r'\bwh\s*o\b', 'who'),
        (r'\bwi\s*th\b', 'with'),
        (r'\bwi\s*ll\b', 'will'),
        (r'\bwo\s*uld\b', 'would'),
        (r'\bco\s*uld\b', 'could'),
        (r'\bsh\s*ould\b', 'should'),
        (r'\bfr\s*om\b', 'from'),
        (r'\bfo\s*r\b', 'for'),
        (r'\bfo\s*und\b', 'found'),
        (r'\bfe\s*el\b', 'feel'),
        (r'\bfe\s*lt\b', 'felt'),
        (r'\bfa\s*ith\b', 'faith'),
        (r'\bou\s*r\b', 'our'),
        (r'\bof\s*ficers\b', 'officers'),
        (r'\bto\s*ok', 'took'),
        (r'\bto\s*o\b', 'too'),
        (r'\bex\s*peri', 'experi'),
        (r'\bex\s*citing', 'exciting'),
        (r'\bim\s*port', 'import'),
        (r'\bap\s*pro', 'appro'),
        (r'\bap\s*pear', 'appear'),
        (r'\bcon\s*cern', 'concern'),
        (r'\bcon\s*tinu', 'continu'),
        (r'\bpro\s*port', 'proport'),
        (r'\bpro\s*gress', 'progress'),
        (r'\bop\s*inion', 'opinion'),
    ]
    
    for pattern, replacement in word_patterns:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix double spaces to single space
    text = re.sub(r'  +', ' ', text)
    
    # Fix spaces before punctuation
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)
    
    return text.strip()

def process_typescript_file(file_path: Path) -> None:
    """Process a TypeScript file to clean OCR artifacts."""
    print(f"Processing {file_path.name}...")
    
    content = file_path.read_text(encoding='utf-8')
    
    # Find all content strings and clean them
    def replace_content(match):
        original = match.group(1)
        # Unescape for processing
        unescaped = original.replace("\\'", "'").replace("\\\\", "\\")
        # Clean the text
        cleaned = clean_ocr_text(unescaped)
        # Re-escape for TypeScript
        escaped = cleaned.replace('\\', '\\\\').replace("'", "\\'")
        return f"content: '{escaped}'"
    
    # Pattern to match content strings
    pattern = r"content: '([^']*(?:\\'[^']*)*)'"
    
    # Replace all content strings
    new_content = re.sub(pattern, replace_content, content)
    
    # Write back
    file_path.write_text(new_content, encoding='utf-8')
    print(f"  ✅ Cleaned {file_path.name}")

def main():
    """Process all Big Book content files."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    content_dir = project_root / 'constants' / 'bigbook-v2' / 'content'
    
    if not content_dir.exists():
        print(f"❌ Content directory not found: {content_dir}")
        return
    
    print("🧹 Cleaning OCR artifacts from Big Book content...\n")
    print("=" * 70)
    
    # Process all TypeScript files except index.ts
    files_processed = 0
    for ts_file in sorted(content_dir.glob('*.ts')):
        if ts_file.name == 'index.ts':
            continue
        
        process_typescript_file(ts_file)
        files_processed += 1
    
    print("=" * 70)
    print(f"\n✅ Cleaned {files_processed} files!")
    print("\n💡 Next steps:")
    print("   1. Run validation: python scripts/validate_bigbook.py")
    print("   2. Test in your app")
    print()

if __name__ == '__main__':
    main()

