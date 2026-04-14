# i-smile | Esthetic Dentistry

Professional, SEO-optimized destination website for **i-smile Esthetic Dentistry**, located in Palaio Faliro, Athens. This project is a high-performance web application designed to showcase premium dental services (Teeth Whitening, Porcelain Veneers, and Clear Aligners) for local, regional, and international patients.

## 🚀 Key Features

- **Local SEO Optimized**: Engineered for high visibility in the Palaio Faliro, Alimos, Nea Smyrni, and Kallithea areas with advanced JSON-LD structured data.
- **Multilingual Support**: Fully localized in **Greek** and **English** with a seamless, URL-based language switching system.
- **Performance Focused**: All visual assets are optimized using the **WebP** format for lightning-fast load times.
- **Premium Design**: A monochrome minimalist aesthetic with vibrant purple accents, featuring smooth animations and a responsive tiered footer layout.
- **Clinical Authority (E-E-A-T)**: Integrated practitioner bio, professional profiles (LinkedIn/Doctoranytime), and clinical transformation galleries.

## 📂 Repository Structure

- `index.html`: The main entry point and "Meet the Dentist" landing page.
- `whitening.html`, `veneers.html`, `aligners.html`: Dedicated treatment-specific pages.
- `js/main.js`: Core site logic, including header/footer injection and dynamic metadata localization.
- `js/i18n.js`: The central translation engine housing all Greek and English text.
- `style.css`: The comprehensive design system and responsive layout rules.
- `docs/`: A dedicated directory for strategy guides, SEO audits, and project planning documents.
- `photos/`: A collection of high-resolution clinical and service photography.

## 🛠️ Maintenance & Updates

### 🌎 Updating Translations
All site text is managed within `js/i18n.js`. To update content, simply locate the appropriate key in the `el` (Greek) or `en` (English) objects and apply your changes.

### 🖼️ Adding Images
For optimal performance, new images should be converted to `.webp` format and stored in the `assets/images/` or `photos/` directory before being referenced in the HTML.

### 📍 Local SEO
To adjust the clinic's local reach or structured data, modify the JSON-LD blocks located in the `<head>` sections of each HTML file and update the "Location & Access" details in the `js/i18n.js` footer section.

---
**Medical Director**: Dr. Angelo Moshopoulos  
**Location**: Plateia Ntavari 2, Palaio Faliro, 17564, Greece  
**Contact**: 210 931 2651 | info@i-smile.gr
