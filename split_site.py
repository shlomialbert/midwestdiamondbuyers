import os
from bs4 import BeautifulSoup

print("Loading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, 'html.parser')

# 1. Grab your universal shell components
head_str = str(soup.find('head')) if soup.find('head') else ""
nav_str = str(soup.find('nav')) if soup.find('nav') else ""
footer_str = str(soup.find('footer')) if soup.find('footer') else ""

# 2. Define the exact IDs found in your file and the folders they should create
sections_to_extract = {
    'categories': 'categories-view',
    'about': 'about-view',
    'appointment': 'appointment-view',
    'contact': 'contact-view'
}

for folder_name, sec_id in sections_to_extract.items():
    section = soup.find(id=sec_id)
    
    if section:
        os.makedirs(folder_name, exist_ok=True)
        
        # CRITICAL FIX: Force the 'active' class so the page isn't hidden by your SPA CSS
        classes = section.get('class', [])
        if 'active' not in classes:
            section['class'] = classes + ['active']
            
        # 3. Construct the page using your specific <main> container
        new_html = f"""<!DOCTYPE html>
<html lang="en">
{head_str}
<body>
    {nav_str}
    <main id="view-container">
        {str(section)}
    </main>
    {footer_str}
</body>
</html>"""

        with open(f"{folder_name}/index.html", "w", encoding="utf-8") as out_file:
            out_file.write(new_html)
            
        print(f"Success: Generated /{folder_name}/index.html")
    else:
        print(f"Error: Could not find id='{sec_id}'")