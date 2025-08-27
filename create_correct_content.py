#!/usr/bin/env python3
import PyPDF2
import re

def clean_text(text):
    """Clean up extracted text"""
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'([a-z])\s*-\s*([a-z])', r'\1-\2', text)  # Fix hyphenation
    return text.strip()

def extract_doctors_opinion_content(pdf_path):
    """Extract Doctor's Opinion content with proper page structure"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            print("Extracting Doctor's Opinion content with proper structure")
            print("=" * 60)
            
            # Extract pages 7-14 (Doctor's Opinion)
            full_content = []
            
            for page_num in range(6, 14):  # 0-indexed, so pages 7-14 are indices 6-13
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                print(f"\n--- PAGE {page_num + 1} ---")
                print(text)
                print("-" * 40)
                
                # Clean the text
                cleaned_text = clean_text(text)
                full_content.append(cleaned_text)
            
            # Now create the properly structured content
            print("\n" + "=" * 60)
            print("STRUCTURED CONTENT FOR content.ts:")
            print("=" * 60)
            
            # Start with the header
            print('  "doctors-opinion": `# THE DOCTOR\'S OPINION')
            print()
            print('*— Page xviii —*')
            print()
            
            # Page 7 content (starts with "WE OF Alcoholics Anonymous...")
            page7_content = full_content[0]
            # Extract the content before the page marker
            if "THE DOCTOR'S OPINION" in page7_content:
                parts = page7_content.split("THE DOCTOR'S OPINION")
                if len(parts) > 1:
                    main_content = parts[0].strip()
                    print(main_content)
                    print()
            
            # Page 8 content (starts with "growth inherent in...")
            page8_content = full_content[1]
            print('*— Page xix —*')
            print()
            print(page8_content)
            print()
            
            # Continue with remaining pages...
            # This is a simplified version - we need to map each page to its correct content
            
    except Exception as e:
        print(f"Error extracting content: {e}")

if __name__ == "__main__":
    extract_doctors_opinion_content("reference/aa.pdf")
