#!/usr/bin/env python3
import PyPDF2
import re

def extract_exact_content(pdf_path):
    """Extract exact content from PDF for Doctor's Opinion pages 7-14"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            print("Extracting exact content from PDF pages 7-14 (Doctor's Opinion)")
            print("=" * 60)
            
            # Extract pages 7-14 (Doctor's Opinion)
            for page_num in range(6, 14):  # 0-indexed, so pages 7-14 are indices 6-13
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                print(f"\n--- PAGE {page_num + 1} ---")
                print(text)
                print("-" * 40)
            
    except Exception as e:
        print(f"Error extracting content: {e}")

if __name__ == "__main__":
    extract_exact_content("reference/aa.pdf")
