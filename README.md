# Tobias Hodel Personal Website

A modern, bilingual academic website built with Hugo and a custom minimal theme.

## 🌐 Live Site

- **German**: [hodelweb.ch](https://hodelweb.ch)
- **English**: [hodelweb.ch/en/](https://hodelweb.ch/en/)
- **Current IP Access**: [194.13.80.183](http://194.13.80.183) (until DNSSEC resolves)

## ✨ Features

- **Modern Minimal Design** → Clean, professional academic layout
- **Bilingual Support** → German/English with language switcher
- **Dark Mode** → Toggle with preference persistence
- **Responsive Design** → Mobile, tablet, desktop optimized
- **Dynamic Publications** → ORCID integration with filtering
- **Interactive Elements** → Search, year filter, type filter
- **Fast Loading** → Optimized Hugo build with minified assets

## 📊 Content

### Publications
- **80 publications** from ORCID (0000-0002-2071-6407)
- **Co-author display** for collaborative works
- **Advanced filtering**: Search by title/author, filter by year/type
- **Direct DOI links** for accessible papers

### Projects
Featured projects with descriptions and links to DHBern:
- **Economies of Space** → Basel real estate research
- **The Flow** → HTR & digital humanities
- **Confoederatio Ludens** → Swiss gaming history
- **GeWiS – Grounded Knowledge** → Linked data for humanities

### Academic Profile
- **Position Updates**: Associate Professor (2025), DH Master Major (2026)
- **University affiliation**: University of Bern, Digital Humanities
- **Profile photo**: Official University of Bern image
- **Contact links**: ORCID, GitHub, Email

## 🏗️ Technical Architecture

### Built With
- **Hugo** → Static site generator (v0.156.0+)
- **Custom Theme** → Modern Minimal design
- **Inter Font** → Google Fonts integration
- **Vanilla JavaScript** → No frameworks, fast loading
- **CSS Grid/Flexbox** → Modern responsive layouts

### File Structure
```
hodelweb/
├── content/                    # Hugo content
│   ├── cv/                    # CV pages (DE/EN)
│   ├── projekte/              # Projects (German)
│   ├── projects/              # Projects (English)
│   ├── publikationen/         # Publications (German)
│   ├── publications/          # Publications (English)
│   └── lehre/                 # Teaching pages
├── layouts/
│   └── index.html             # Custom homepage template
├── static/
│   ├── images/profile.jpg     # Profile photo
│   └── publications.json     # ORCID data for dynamic loading
├── scripts/
│   ├── fetch_orcid.py         # Original ORCID fetcher
│   ├── fetch_orcid_enhanced.py # Enhanced with co-authors
│   └── check_dnssec.sh        # DNS monitoring
├── hugo.toml                  # Hugo configuration
└── README.md                  # This file
```

### Data Sources
- **Publications**: ORCID API (0000-0002-2071-6407)
- **Projects**: Links to [dhbern.github.io](https://dhbern.github.io/content/projects/)
- **Profile Image**: University of Bern official photo

## 🚀 Development

### Prerequisites
- **Hugo Extended** (v0.156.0+)
- **Python 3** (for ORCID scripts)
- **Git** (for deployment)

### Local Development
```bash
# Clone repository
git clone git@github.com:thodel/hodelweb.git
cd hodelweb

# Start development server
hugo serve -D

# Visit http://localhost:1313
```

### Build for Production
```bash
# Generate optimized site
hugo --minify

# Output in public/ directory
```

### Update Publications
```bash
# Fetch latest from ORCID
python3 scripts/fetch_orcid.py

# Enhanced version with co-authors (when ORCID API allows)
python3 scripts/fetch_orcid_enhanced.py

# Rebuild site
hugo --minify
```

## 🔧 Customization

### Theme Colors
Customize in `layouts/index.html`:
```css
:root {
  --bg: #ffffff;           /* Background */
  --text: #111111;         /* Text color */
  --accent: #2563eb;       /* Link/accent color */
  --border: #e5e7eb;       /* Border color */
}

[data-theme="dark"] {
  --bg: #0f172a;           /* Dark background */
  --text: #f1f5f9;         /* Dark text */
  --accent: #60a5fa;       /* Dark accent */
}
```

### Adding Projects
Edit the projects section in `layouts/index.html`:
```html
<div class="card">
  <h3>Project Name</h3>
  <p>Description in current language</p>
  <a href="https://link-to-project.com">Learn more →</a>
</div>
```

### Language Content
- **German content**: Use `{{ if eq .Site.Language.Lang "de" }}German{{ else }}English{{ end }}`
- **Navigation**: Auto-translates based on language
- **URLs**: `/` (German), `/en/` (English)

## 📋 Content Management

### Publications
- **Auto-updated** from ORCID profile
- **Co-authors** displayed when available
- **DOI links** for accessible papers
- **Filtering** by title, author, year, type

### Position Updates
Update the position box in `layouts/index.html`:
```html
<div class="position-updates">
  <p><strong>Since 2025:</strong> Associate Professor</p>
  <p><strong>Since 2026:</strong> Responsible for DH Master Major</p>
</div>
```

### Profile Image
Replace `static/images/profile.jpg` with new image:
- **Recommended size**: 400x400px minimum
- **Format**: JPG or PNG
- **Aspect ratio**: Square (1:1)

## 🌐 Deployment

### Current Setup
- **Web Server**: Caddy (production) / Hugo dev server (development)
- **Domain**: hodelweb.ch + www.hodelweb.ch
- **SSL**: Automatic via Caddy (when DNSSEC resolves)
- **CDN**: Direct serving (static files)

### Deployment Commands
```bash
# On production server
cd /home/th/repos/hodelweb
git pull origin main
python3 scripts/fetch_orcid.py  # Update publications
hugo --minify                    # Build site
# Caddy auto-serves from public/
```

### DNS Configuration
- **Domain**: hodelweb.ch (Netcup)
- **A Record**: @ → 194.13.80.183
- **CNAME**: www → hodelweb.ch
- **DNSSEC**: Currently disabled due to registry issues

## 🔧 Maintenance

### Regular Tasks
1. **Publications Update**: Monthly via `scripts/fetch_orcid.py`
2. **Hugo Update**: Check for new versions quarterly
3. **Dependencies**: Monitor for security updates
4. **Content Review**: Annual CV/projects review

### Monitoring
- **DNSSEC Check**: Automated every 10 minutes
- **Site Availability**: Caddy health checks
- **SSL Certificate**: Auto-renewal via Caddy

### Troubleshooting

**Publications not loading:**
- Check `static/publications.json` exists
- Verify ORCID API accessibility
- Check browser console for JavaScript errors

**Dark mode not working:**
- Clear localStorage: `localStorage.clear()`
- Check CSS custom properties support

**Language switching issues:**
- Verify Hugo language configuration in `hugo.toml`
- Check content exists in both `/content/` and `/content/en/`

**Build failures:**
- Ensure Hugo Extended version
- Check for template syntax errors in `layouts/`
- Verify all required files exist

## 📞 Support

- **Repository**: [github.com/thodel/hodelweb](https://github.com/thodel/hodelweb)
- **Hugo Documentation**: [gohugo.io/documentation](https://gohugo.io/documentation/)
- **Deployment Questions**: Contact system administrator

## 📄 License

Content: © 2026 Tobias Hodel
Code: Open source (theme customization available)

---

*Last updated: February 2026*