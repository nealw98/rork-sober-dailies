#!/usr/bin/env python3
import PyPDF2
import re

def extract_doctors_opinion(pdf_path):
    """Extract Doctor's Opinion content from PDF with proper page markers"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            
            print(f"Extracting Doctor's Opinion from {pdf_path}")
            print(f"Total pages: {num_pages}")
            print("=" * 60)
            
            # Look for Doctor's Opinion content (pages xviii-xxx)
            doctors_opinion_content = []
            
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Look for Doctor's Opinion indicators
                if "DOCTOR'S OPINION" in text.upper() or "THE DOCTOR'S OPINION" in text.upper():
                    print(f"Found Doctor's Opinion on page {page_num + 1}")
                    doctors_opinion_content.append(f"Page {page_num + 1}: {text[:200]}...")
                
                # Look for page numbers in Roman numerals (xviii-xxx)
                if any(roman in text.upper() for roman in ['XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX']):
                    print(f"Found Roman numeral page on page {page_num + 1}")
                    doctors_opinion_content.append(f"Page {page_num + 1}: {text[:200]}...")
            
            return doctors_opinion_content
            
    except Exception as e:
        print(f"Error extracting content: {e}")
        return []

if __name__ == "__main__":
    content = extract_doctors_opinion("reference/aa.pdf")
    for item in content:
        print(item)
        print("-" * 40)
