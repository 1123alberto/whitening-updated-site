// ============================================
// i-smile | Shared Site Logic
// ============================================
// Handles: header/footer injection, navigation,
// language toggle, scroll reveals, mobile menu
// ============================================

// Language handling (Priority: URL ?lang= > localStorage > default 'el')
const urlParams = new URLSearchParams(window.location.search);
let currentLang = urlParams.get('lang') || localStorage.getItem('ismile-lang') || 'el';
// Ensure only supported languages are used
if (!['el', 'en'].includes(currentLang)) currentLang = 'el';
localStorage.setItem('ismile-lang', currentLang);
document.documentElement.lang = currentLang; // Immediate SEO signal update

// ── Helper: Localize Internal Links ──
function localizeHref(href) {
    if (!href || href.startsWith('#') || href.startsWith('http') || currentLang === 'el') return href;
    return href.includes('?') ? `${href}&lang=${currentLang}` : `${href}?lang=${currentLang}`;
}

// ── Shared Header HTML ──
function getHeaderHTML() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const navItems = [
        { href: 'whitening.html', key: 'nav_whitening' },
        { href: 'veneers.html', key: 'nav_veneers' },
        { href: 'aligners.html', key: 'nav_aligners' },
        { href: '#contact', key: 'nav_contact' },
    ];

    const navLinks = navItems.map(item => {
        const isActive = currentPage === item.href ? ' class="active"' : '';
        const href = localizeHref(item.href);
        return `<a href="${href}"${isActive} data-i18n="${item.key}">${translations[currentLang][item.key]}</a>`;
    }).join('\n                ');

    return `
    <div class="container d-flex align-center justify-between">
        <a href="${localizeHref('index.html')}" class="text-logo">
            <span class="logo-cursive">i<span class="logo-hyphen">-</span>smile</span>
            <span class="logo-subtitle">COSMETIC DENTISTRY</span>
        </a>

        <nav class="nav-links">
            ${navLinks}
        </nav>

        <div class="header-actions">
            <button id="lang-toggle" class="lang-btn" aria-label="Switch Language">${currentLang === 'el' ? 'EN' : 'EL'}</button>
            <a href="${localizeHref('book.html')}" class="btn btn-primary" data-i18n="book_now">${translations[currentLang].book_now}</a>
            <button class="mobile-menu-btn" aria-label="Open Navigation Menu">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    </div>`;
}

// ── Shared Footer HTML ──
function getFooterHTML() {
    const t = translations[currentLang];
    return `
    <div class="container footer-grid">
        <div class="footer-col brand-col">
            <a href="${localizeHref('index.html')}" class="text-logo footer-logo mb-3">
                <span class="logo-cursive">i<span class="logo-hyphen">-</span>smile</span>
                <span class="logo-subtitle">COSMETIC DENTISTRY</span>
            </a>
            <p class="footer-about" data-i18n="footer_about">${t.footer_about}</p>
            <div class="footer-map-container mt-4">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3148.016335198!2d23.70132771532!3d37.93088077973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a1bc37b5d18049%3A0x429c5800724d6f8d!2sPlateia%20Ntavari%202%2C%20Palaio%20Faliro%20175%2064%2C%20Greece!5e0!3m2!1sen!2sgr!4v1713080000000!5m2!1sen!2sgr" width="100%" height="150" style="border:0; border-radius: 8px; filter: grayscale(1) invert(0.9);" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
        </div>

        <div class="footer-col">
            <h4 data-i18n="contact_info">${t.contact_info}</h4>
            <address class="contact-details">
                <p>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span data-i18n="address_text">${t.address_text}</span>
                </p>
                <p>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <a href="tel:2109312651">210 931 2651</a>
                </p>
                <p>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <a href="mailto:info@i-smile.gr">info@i-smile.gr</a>
                </p>
            </address>
        </div>

        <div class="footer-col">
            <h4 data-i18n="working_hours">${t.working_hours}</h4>
            <ul class="hours-list mb-4">
                <li><span class="day" data-i18n="mon_fri">${t.mon_fri}</span> <span class="time">10:00 - 20:00</span></li>
                <li><span class="day" data-i18n="sat">${t.sat}</span> <span class="time" data-i18n="sat_hours">${t.sat_hours}</span></li>
                <li><span class="day" data-i18n="sun">${t.sun}</span> <span class="time" data-i18n="closed">${t.closed}</span></li>
            </ul>

            <h4 data-i18n="service_areas_title">${t.service_areas_title}</h4>
            <p class="service-areas-list" data-i18n="service_areas_list" style="font-size: 0.9rem; color: var(--clr-mid-gray); line-height: 1.4;">${t.service_areas_list}</p>
        </div>

        <div class="footer-col">
            <h4 data-i18n="credentials_title">${t.credentials_title}</h4>
            <ul class="credentials-list" style="font-size: 0.85rem; color: var(--clr-mid-gray); line-height: 1.6; padding-left: 1.2rem;">
                <li class="mb-2">
                    <span data-i18n="medical_director_title">${t.medical_director_title}</span><br>
                    <a href="https://www.linkedin.com/in/angelo-moshopoulos-a93476403/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(0,0,0,0.2);" data-i18n="dentist_name">${t.dentist_name}</a>
                </li>
                <li class="mb-2">
                    <a href="https://www.doctoranytime.gr/d/Odontiatros/moshopoulos-aggelos" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(0,0,0,0.2);">Doctoranytime Profile</a>
                </li>
                <li class="mb-2">
                    <a href="https://www.osp.gr/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(0,0,0,0.2);" data-i18n="affiliation_text">${t.affiliation_text}</a>
                </li>
                <li>
                    <span data-i18n="afm_text">${t.afm_text}</span>
                </li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom text-center">
        <p>&copy; <span id="year"></span> <a href="https://dentplant.gr" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; cursor: inherit; pointer-events: auto;">A Dentplant Clinic</a>. <span data-i18n="rights">${t.rights}</span> | <a href="${localizeHref('privacy.html')}" style="color: inherit; text-decoration: underline;" data-i18n="privacy_policy">${t.privacy_policy}</a></p>
    </div>`;
}

// ── Metadata Localization ──
function applyMetadataLocalization() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    let page = 'index';

    if (filename.includes('whitening')) page = 'whitening';
    else if (filename.includes('veneers')) page = 'veneers';
    else if (filename.includes('aligners')) page = 'aligners';
    else if (filename.includes('book')) page = 'book';
    else if (filename.includes('privacy')) page = 'privacy';
    else if (filename.includes('manage')) page = 'manage';

    const meta = translations[currentLang].meta[page];
    if (meta) {
        // Document Title
        document.title = meta.title;

        // Meta Description
        const descEl = document.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute('content', meta.desc);

        // Social Metadata (Open Graph)
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', meta.title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', meta.desc);

        // Twitter Card
        const twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.setAttribute('content', meta.title);

        const twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc) twDesc.setAttribute('content', meta.desc);
    }
}

// ── Initialize Shared Components ──
document.addEventListener("DOMContentLoaded", () => {
    // Inject Header
    const headerEl = document.getElementById('header-root');
    if (headerEl) {
        headerEl.innerHTML = getHeaderHTML();
    }

    // Inject Footer
    const footerEl = document.getElementById('footer-root');
    if (footerEl) {
        footerEl.innerHTML = getFooterHTML();
    }

    // Set document language
    document.documentElement.lang = currentLang;

    // ── Apply stored language to all elements on load ──
    // Inject translations from i18n.js for all elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[currentLang] && translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });


    // Apply localized metadata
    applyMetadataLocalization();

    // ── Mobile Menu Toggle ──
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // ── Language Toggle ──
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            const nextLang = currentLang === 'el' ? 'en' : 'el';
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('lang', nextLang);
            window.location.href = newUrl.toString();
        });
    }

    // ── Scroll Reveal Animation ──
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 50;
        revealElements.forEach(el => {
            const revealTop = el.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                el.classList.add('active');
            }
        });
    };
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // ── Header Scroll Effect ──
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ── CTA Banner Parallax ──
    const ctaBanners = document.querySelectorAll('.cta-banner');
    if (ctaBanners.length > 0) {
        // Inject background image elements
        ctaBanners.forEach(banner => {
            const bgDiv = document.createElement('div');
            bgDiv.className = 'cta-bg-image';
            banner.insertBefore(bgDiv, banner.firstChild);
        });

        const bgElements = document.querySelectorAll('.cta-bg-image');
        const parallax = () => {
            bgElements.forEach(bg => {
                const banner = bg.parentElement;
                const rect = banner.getBoundingClientRect();
                const windowH = window.innerHeight;
                if (rect.bottom > -200 && rect.top < windowH + 200) {
                    const progress = (windowH - rect.top) / (windowH + rect.height);
                    const translateY = (progress - 0.5) * 60;
                    bg.style.transform = `translateY(${translateY}px)`;
                }
            });
        };
        window.addEventListener('scroll', parallax, { passive: true });
        parallax();
    }

    // ── Footer Year ──
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // ── FAQ Accordion ──
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item.open').forEach(openItem => {
                openItem.classList.remove('open');
            });

            // Toggle clicked
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
});

// ── Expose for booking.js ──
window.currentLang = currentLang;
// Keep currentLang in sync
Object.defineProperty(window, 'currentLang', {
    get: () => currentLang,
    set: (val) => { currentLang = val; }
});
