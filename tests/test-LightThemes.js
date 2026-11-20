'use strict';

// Regression tests for the light theme system: clicking a theme/color button
// must never flip the room to dark surfaces (the legacy upstream themes did,
// producing dark ink text on dark panels — an unreadable "black page").

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const roomSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'Room.js'), 'utf8');
const roomHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'views', 'Room.html'), 'utf8');

function extractThemeBlock() {
    const start = roomSource.indexOf('const LIGHT_THEME_BASE = {');
    const end = roomSource.indexOf('function applyTheme(', start);
    assert.ok(start >= 0 && end > start, 'light theme block found in Room.js');
    return roomSource.slice(start, end);
}

describe('light theme system', () => {
    let themeMap;

    before(() => {
        const context = vm.createContext({});
        vm.runInContext(
            `${extractThemeBlock()}\nglobalThis.__themes = { themeMap, LIGHT_THEME_BASE };`,
            context
        );
        themeMap = context.__themes.themeMap;
    });

    it('keeps the upstream theme keys and order so stored selections stay valid', () => {
        assert.deepEqual(Object.keys(themeMap), [
            'default',
            'dark',
            'grey',
            'green',
            'blue',
            'red',
            'purple',
            'orange',
            'pink',
            'yellow',
        ]);
    });

    it('renders every theme on light surfaces with dark ink (no dark-on-dark)', () => {
        for (const [name, props] of Object.entries(themeMap)) {
            assert.equal(props['--settings-bg'], '#ffffff', `${name}: settings panel`);
            assert.equal(props['--msger-bg'], '#ffffff', `${name}: chat panel`);
            assert.equal(props['--trx-bg'], '#ffffff', `${name}: transcript panel`);
            assert.equal(props['--wb-bg'], '#ffffff', `${name}: whiteboard`);
            assert.equal(props['--dd-color'], '#14142b', `${name}: dropdown ink`);
            assert.equal(props['--ink'], '#14142b', `${name}: base ink`);
            assert.ok(props['--body-bg'].includes('#f8f9fe'), `${name}: light canvas`);
            assert.equal(props['--room-switch-ink'], '#ffffff', `${name}: switch ink`);
            assert.ok(!props['--body-bg'].includes('#0e0e14'), `${name}: no legacy dark gradient`);
        }
    });

    it('gives each theme its own accent while sharing the light base', () => {
        const accents = Object.values(themeMap).map((props) => props['--room-switch-accent']);
        assert.equal(new Set(accents).size, accents.length, 'all accents are distinct');
        assert.equal(themeMap.default['--room-switch-accent'], '#4f46e5');
        assert.equal(themeMap.red['--room-switch-accent'], '#dc2626');
    });

    it('matches the theme select options in Room.html', () => {
        const selectStart = roomHtml.indexOf('id="selectTheme"');
        const selectEnd = roomHtml.indexOf('</select>', selectStart);
        assert.ok(selectStart >= 0 && selectEnd > selectStart, 'selectTheme found in Room.html');
        const selectHtml = roomHtml.slice(selectStart, selectEnd);
        const options = [...selectHtml.matchAll(/<option value="([a-z]+)">/g)].map((m) => m[1]);
        assert.deepEqual(options, Object.keys(themeMap));
    });

    it('custom color themes only re-accent the light surface', () => {
        const start = roomSource.indexOf('function applyTheme(');
        const end = roomSource.indexOf('function setTheme(', start);
        assert.ok(start >= 0 && end > start);

        const applied = {};
        const context = vm.createContext({
            document: {
                documentElement: { style: { setProperty: (k, v) => (applied[k] = v) } },
                body: { style: {} },
            },
            setSwalTheme: () => {},
            themeCustom: { color: '#123456' },
        });
        vm.runInContext(
            `${extractThemeBlock()}\n${roomSource.slice(start, end)}\nglobalThis.__custom = setCustomTheme;`,
            context
        );
        context.__custom();

        assert.equal(applied['--settings-bg'], '#ffffff');
        assert.equal(applied['--dd-color'], '#14142b');
        assert.equal(applied['--room-switch-accent'], '#123456');
        assert.notEqual(applied['--btns-bg-color'], 'rgba(0, 0, 0, 0.7)');
    });
});
