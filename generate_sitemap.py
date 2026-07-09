import os
from datetime import datetime

domain = "https://midwestdiamondbuyers.com"
today = datetime.today().strftime('%Y-%m-%d')

sitemap_content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
]

# 1. Define the pages we want to index
directories = [
    '.', 'about', 'contact', 'appointment', 'categories',
    'faq', 'blog', 'privacy', 'terms', 'shipping',
    'blog-estate-jewelry-value', 'blog-how-gold-offers-are-calculated',
    'blog-lab-grown-vs-natural', 'blog-private-office-why-it-matters',
    'blog-selling-rolex-and-luxury-watches', 'blog-what-affects-diamond-offer',
    'blog-what-to-bring-to-appointment'
]
low_priority = ['privacy', 'terms', 'shipping']

# 2. Add every folder (Home, About, blog posts, etc. — all now clean URLs, no .html)
for d in directories:
    if os.path.exists(os.path.join(d, 'index.html')):
        url_path = f"{domain}/" if d == '.' else f"{domain}/{d}/"
        if d == '.':
            priority = "1.0"
        elif d in low_priority:
            priority = "0.5"
        else:
            priority = "0.8"

        sitemap_content.append(f"""  <url>
    <loc>{url_path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{priority}</priority>
  </url>""")

sitemap_content.append('</urlset>')

# 4. Write the file
with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sitemap_content))

print("Success: sitemap.xml generated successfully!")