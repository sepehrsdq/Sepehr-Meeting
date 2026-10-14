'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const landingHtml = fs.readFileSync(path.join(__dirname, '../public/views/landing.html'), 'utf8');
const brandScript = fs.readFileSync(path.join(__dirname, '../public/js/Brand.js'), 'utf8');

// Brand settings arrive either from the server or from the cached copy, whichever is fresher.
function mountWithBrand(brand, source) {
    const dom = new JSDOM(landingHtml, { url: 'https://example.com', runScripts: 'outside-only' });
    if (source === 'cache') {
        dom.window.sessionStorage.setItem('brandData', JSON.stringify(brand));
    }
    dom.window.fetch = async () => ({ ok: true, json: async () => ({ message: brand }) });
    dom.window.console.log = () => {};
    const ready = new Promise((resolve) =>
        dom.window.document.addEventListener('brand:ready', resolve, { once: true })
    );
    dom.window.eval(brandScript);
    return { dom, ready };
}

describe('Landing brand visibility', () => {
    for (const source of ['server', 'cache']) {
        for (const features of [true, false]) {
            it(`${source}: Features=${features} toggles the capabilities section`, async () => {
                const { dom, ready } = mountWithBrand({ html: { features } }, source);
                try {
                    await ready;
                    const section = dom.window.document.getElementById('capabilities');
                    assert.ok(section, 'the landing has a capabilities section');
                    assert.equal(section.style.display, features ? '' : 'none');
                    const navLinks = [...dom.window.document.querySelectorAll('a[href="#capabilities"]')];
                    assert.ok(navLinks.length > 0, 'the landing links to the capabilities section');
                    navLinks.forEach((link) => assert.equal(link.style.display, features ? '' : 'none'));
                } finally {
                    dom.window.close();
                }
            });
        }

        it(`${source}: disabling About and FAQ keeps the landing usable`, async () => {
            const { dom, ready } = mountWithBrand({ html: { landingAbout: false, faq: false } }, source);
            try {
                await ready;
                const document = dom.window.document;
                // The Persian landing has no About/FAQ blocks; the flags must not break rendering.
                assert.equal(document.getElementById('capabilities').style.display, '');
                assert.ok(document.getElementById('joinRoomButton'));
                assert.equal(document.getElementById('features'), null);
            } finally {
                dom.window.close();
            }
        });
    }

    it('falls back to the static landing when older cached settings omit a flag', async () => {
        const { dom, ready } = mountWithBrand({ html: { poweredBy: false } }, 'cache');
        try {
            await ready;
            const document = dom.window.document;
            assert.equal(document.getElementById('capabilities').style.display, '');
            assert.equal(document.getElementById('footer').style.display, '');
        } finally {
            dom.window.close();
        }
    });
});
