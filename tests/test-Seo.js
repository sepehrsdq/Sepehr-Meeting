const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { buildRobotsTxt, buildSitemapXml, buildJsonLd } = require('../app/src/Seo');
const HtmlInjector = require('../app/src/HtmlInjector');

describe('test-Seo', function () {
    const landing = path.join(__dirname, '../public/views/landing.html');
    const room = path.join(__dirname, '../public/views/Room.html');

    it('robots.txt disallows private pages and advertises the sitemap', () => {
        const txt = buildRobotsTxt('https://example.com/');
        assert.ok(txt.includes('Disallow: /join'));
        assert.ok(txt.includes('Sitemap: https://example.com/sitemap.xml'));
        assert.ok(!txt.includes('Disallow: /\n'));
    });

    it('robots.txt blocks everything for protected hosts', () => {
        const txt = buildRobotsTxt('https://example.com', { blockAll: true });
        assert.ok(txt.includes('Disallow: /\n'));
        assert.ok(!txt.includes('Sitemap:'));
    });

    it('sitemap lists only public pages under the configured base url', () => {
        const xml = buildSitemapXml('https://example.com/', new Date('2026-01-02T00:00:00Z'));
        assert.ok(xml.includes('<loc>https://example.com/</loc>'));
        assert.ok(xml.includes('<loc>https://example.com/privacy</loc>'));
        assert.ok(xml.includes('<lastmod>2026-01-02</lastmod>'));
        assert.ok(!xml.includes('/join'));
    });

    it('JSON-LD is valid JSON and cannot break out of the script tag', () => {
        const json = buildJsonLd({
            name: 'Sepehr Meeting',
            description: '</script><script>alert(1)</script>',
            url: 'https://example.com',
            image: 'https://example.com/i.png',
        });
        assert.ok(!json.includes('<'));
        const data = JSON.parse(json);
        assert.strictEqual(data['@graph'][1]['@type'], 'SoftwareApplication');
    });

    it('landing page injects canonical, valid JSON-LD blocks and no leftover placeholders', () => {
        const brand = { htmlInjection: true, og: { url: 'https://example.com/' } };
        const injector = new HtmlInjector([landing], brand);
        let html = '';
        injector.injectHtml(landing, { headersSent: false, send: (body) => (html = body) });
        injector.cleanup();

        assert.ok(html.includes('<link rel="canonical" href="https://example.com/" />'));
        assert.ok(html.includes('<meta property="og:url" content="https://example.com/" />'));
        assert.ok(!/{{(CANONICAL_URL|JSON_LD|OG_[A-Z_]+)}}/.test(html));
        const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        assert.strictEqual(blocks.length, 1);
        const data = JSON.parse(blocks[0][1]);
        const website = data['@graph'].find((node) => node['@type'] === 'WebSite');
        assert.strictEqual(website.inLanguage, 'fa');
        assert.ok(html.includes('id="capabilities"') && html.includes('id="join"'));
    });

    for (const landingAbout of [true, false]) {
        for (const faq of [true, false]) {
            it(`landing visibility follows About=${landingAbout}, FAQ=${faq}`, () => {
                const brand = { htmlInjection: true, html: { landingAbout, faq } };
                const injector = new HtmlInjector([landing], brand);
                let html = '';
                try {
                    injector.injectHtml(landing, { headersSent: false, send: (body) => (html = body) });
                } finally {
                    injector.cleanup();
                }

                // The Persian landing ships a single static FAQ-free page: the flags must not strip content.
                assert.ok(html.includes('id="capabilities"') && html.includes('id="join"'));
                assert.ok(!html.includes('<!-- LANDING_'));
                const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
                assert.strictEqual(blocks.length, 1);
            });
        }
    }

    it('keeps static landing sections when brand injection is disabled', () => {
        const injector = new HtmlInjector([landing], {
            htmlInjection: false,
            og: { url: 'https://example.com' },
            html: { landingAbout: false, faq: false },
        });
        let html = '';
        try {
            injector.injectHtml(landing, { headersSent: false, send: (body) => (html = body) });
        } finally {
            injector.cleanup();
        }
        assert.ok(html.includes('id="capabilities"') && html.includes('id="join"'));
        assert.ok(html.includes('<link rel="canonical" href="https://example.com/" />'));
        assert.ok(!html.includes('{{CANONICAL_URL}}'));
    });

    it('room pages are not indexable', () => {
        assert.ok(fs.readFileSync(room, 'utf8').includes('<meta name="robots" content="noindex, nofollow" />'));
    });
});
