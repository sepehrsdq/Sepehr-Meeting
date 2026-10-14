'use strict';

const brandDataKey = 'brandData';
const brandData = window.sessionStorage.getItem(brandDataKey);

const title = document.getElementById('title');
const icon = document.getElementById('icon');
const appleTouchIcon = document.getElementById('appleTouchIcon');
const newRoomTitle = document.getElementById('newRoomTitle');
const newRoomDescription = document.getElementById('newRoomDescription');

const description = document.getElementById('description');
const keywords = document.getElementById('keywords');

const appTitle = document.getElementById('appTitle');
const appDescription = document.getElementById('appDescription');
const joinDescription = document.getElementById('joinDescription');
const joinRoomBtn = document.getElementById('joinRoomButton');
const customizeRoomBtn = document.getElementById('customizeRoomButton');
const joinLastLabel = document.getElementById('joinLastLabel');

const topSponsors = document.getElementById('topSponsors');
const landingAbout = document.getElementById('about');
const faq = document.getElementById('faq');
const navAboutLink = document.getElementById('navAboutLink');
const navFaqLink = document.getElementById('navFaqLink');
const features = document.getElementById('features') || document.getElementById('capabilities');
const teams = document.getElementById('teams');
const tryEasier = document.getElementById('tryEasier');
const poweredBy = document.getElementById('poweredBy');
const sponsors = document.getElementById('sponsors');
const pastSponsors = document.getElementById('pastSponsors');
const advertisers = document.getElementById('advertisers');
const supportUs = document.getElementById('supportUs');
const footer = document.getElementById('footer');
const navGithubLink = document.getElementById('navGithubLink');
const appSwitcher = document.getElementById('appSwitcher');

const waitingRoomHeading = document.getElementById('waitingRoomHeading');
const waitingRoomDescription = document.getElementById('waitingRoomDescription');
const waitingRoomStatus = document.getElementById('waitingStatus');
const waitingRoomHostLink = document.getElementById('waitingRoomHostLink');
const waitingRoomLoginLink = document.getElementById('waitingRoomLoginLink');

const loginHeading = document.getElementById('loginHeading');
const loginDescription = document.getElementById('loginDescription');
const loginButton = document.getElementById('loginButton');
//...

// app/src/config.js - ui.brand
let BRAND = {
    app: {
        language: 'fa',
        name: 'سامانه سپهر',
        title: 'جلسه‌های مهم، در فضایی <span class="sp-gradient-text">روشن و امن</span>',
        description:
            'بدون نصب، بدون پیچیدگی. یک لینک بفرستید و در چند ثانیه کنار همکاران‌تان باشید؛ با تصویر شفاف، صدای روان و اشتراک صفحه.',
        joinDescription: 'جلسه تازه‌ای بسازید',
        joinButtonLabel: 'ورود به جلسه',
        customizeButtonLabel: 'تنظیمات پیشرفته جلسه',
        joinLastLabel: 'جلسه اخیر شما:',
    },
    site: {
        title: 'سامانه سپهر — جلسات تصویری سازمانی',
        icon: '../images/logo.svg',
        appleTouchIcon: '../images/logo.svg',
        newRoomTitle: 'سه گام ساده تا جلسه شما',
        newRoomDescription:
            'برای هر جلسه یک نشانی اختصاصی ساخته می‌شود؛ آن را با همکاران خود به اشتراک بگذارید و بدون معطلی جلسه را آغاز کنید.',
    },
    meta: {
        description:
            'سامانه سپهر؛ بستر جلسات تصویری سازمانی، امن و سریع. بدون نصب، مستقیماً در مرورگر و با میزبانی کامل در شبکه داخلی سازمان.',
        keywords:
            'جلسه تصویری, ویدیو کنفرانس, جلسه آنلاین, سامانه سپهر, تماس تصویری, اشتراک صفحه, اتاق انتظار, جلسات سازمانی',
    },
    html: {
        topSponsors: true,
        landingAbout: true,
        faq: true,
        features: true,
        teams: true,
        tryEasier: true,
        poweredBy: true,
        sponsors: true,
        pastSponsors: true,
        advertisers: true,
        supportUs: true,
        footer: true,
        version: true,
        appSwitcher: false,
    },
    appSwitcher: {
        domain: 'sepehr.com',
        apps: '',
        urls: {},
    },
    whoAreYou: {
        title: 'سامانه سپهر — در انتظار آغاز جلسه',
        waitingRoomHeading: 'در انتظار میزبان',
        waitingRoomDescription:
            'جلسه هنوز آغاز نشده است.<br />به‌محض ورود میزبان، به‌طور خودکار به جلسه منتقل خواهید شد.',
        waitingRoomStatus: 'در حال بررسی وضعیت جلسه...',
        waitingRoomReady: 'جلسه آماده است؛ در حال انتقال...',
        waitingRoomWaiting: 'در انتظار آغاز جلسه از سوی میزبان...',
        waitingRoomHostLink: 'میزبان جلسه هستید؟',
        waitingRoomLoginLink: 'ورود مدیران',
        waitingRoomElapsedJust: 'لحظاتی است در انتظار هستید',
        waitingRoomElapsedMinutes: 'حدود {minutes} است در انتظار هستید',
        waitingRoomSongUrl: '',
    },
    login: {
        heading: 'ورود به سامانه',
        description: 'برای دسترسی به پنل مدیریت، اطلاعات حساب خود را وارد کنید.',
        buttonLabel: 'ورود',
    },
    about: {
        imageUrl: '../images/logo.svg',
        title: '<strong>سامانه سپهر</strong>',
        html: `
            <div class="about-content">
                <p class="about-description">
                    بستر جلسات تصویری سازمانی؛ امن، سریع و ساده.
                </p>
                <a
                    class="about-primary-action"
                    href="/"
                    rel="noopener noreferrer"
                >
                    <i class="fas fa-info-circle" aria-hidden="true"></i>
                    <span>درباره سامانه</span>
                </a>
                <footer class="about-footer">
                    &copy; ${new Date().getFullYear()} سامانه سپهر. همه حقوق محفوظ است.
                </footer>
            </div>
        `,
    },
    widget: {
        enabled: false,
        roomId: 'support-room',
        theme: 'light',
        widgetState: 'minimized',
        widgetType: 'support',
        supportWidget: {
            position: 'top-right',
            expertImages: [],
            buttons: {
                audio: true,
                video: true,
                screen: true,
                chat: true,
                join: true,
            },
            checkOnlineStatus: false,
            isOnline: true,
            customMessages: {
                heading: 'کمک لازم دارید؟',
                subheading: 'تیم پشتیبانی آماده کمک به شماست.',
                connectText: 'اتصال در چند ثانیه',
                onlineText: 'در دسترس هستیم',
                offlineText: 'در حال حاضر آفلاین هستیم',
                poweredBy: 'سامانه سپهر',
            },
            alert: {
                enabled: false,
                type: 'email',
            },
        },
    },
    //...
};

async function initialize() {
    await getBrand();

    // RTL support: set document direction from the configured UI language.
    // I18n.js re-applies this per selected language on pages where it loads.
    const RTL_LANGS = ['fa', 'ar', 'ur', 'he', 'ps', 'sd', 'ckb'];
    const lang = BRAND?.app?.language || 'en';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', RTL_LANGS.includes(lang) ? 'rtl' : 'ltr');

    customizeSite();

    customizeMetaTags();

    customizeApp();

    customizeWidget();

    customizeWhoAreYou();

    customizeLogin();

    checkBrand();

    // Notify listeners (e.g. I18n.js) that BRAND is fully resolved.
    // The flag covers listeners attached after the event fired (e.g. cached brandData).
    window.brandReady = true;
    document.dispatchEvent(new CustomEvent('brand:ready'));
}

async function getBrand() {
    if (brandData) {
        setBrand(JSON.parse(brandData));
    } else {
        try {
            const response = await fetch('/brand', { timeout: 5000 });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const serverBrand = data.message;
            if (serverBrand) {
                setBrand(serverBrand);
                console.log('FETCH BRAND SETTINGS', {
                    serverBrand: serverBrand,
                    clientBrand: BRAND,
                });
                window.sessionStorage.setItem(brandDataKey, JSON.stringify(serverBrand));
            } else {
                console.warn('FETCH BRAND SETTINGS - DISABLED');
            }
        } catch (error) {
            console.error('FETCH GET BRAND ERROR', error.message);
        }
    }
}

// BRAND configurations
function setBrand(data) {
    BRAND = mergeBrand(BRAND, data);
    console.log('Set Brand done');
}

function mergeBrand(current, updated) {
    for (const key of Object.keys(updated)) {
        const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
        if (!isObject(updated[key]) || !isObject(current[key])) {
            current[key] = updated[key];
        } else {
            mergeBrand(current[key], updated[key]);
        }
    }
    return current;
}

// BRAND check
function checkBrand() {
    !BRAND.html.topSponsors && elementDisplay(topSponsors, false);
    !BRAND.html.landingAbout && elementDisplay(landingAbout, false);
    !BRAND.html.landingAbout && elementDisplay(navAboutLink, false);
    !BRAND.html.faq && elementDisplay(faq, false);
    !BRAND.html.faq && elementDisplay(navFaqLink, false);
    !BRAND.html.features && elementDisplay(features, false);
    !BRAND.html.features && document.querySelectorAll('a[href="#capabilities"]').forEach((link) => elementDisplay(link, false));
    !BRAND.html.teams && elementDisplay(teams, false);
    !BRAND.html.tryEasier && elementDisplay(tryEasier, false);
    !BRAND.html.poweredBy && elementDisplay(poweredBy, false);
    !BRAND.html.sponsors && elementDisplay(sponsors, false);
    !BRAND.html.pastSponsors && elementDisplay(pastSponsors, false);
    !BRAND.html.advertisers && elementDisplay(advertisers, false);
    !BRAND.html.supportUs && elementDisplay(supportUs, false);
    !BRAND.html.footer && elementDisplay(footer, false);
    !BRAND.html.footer && elementDisplay(navGithubLink, false);
    if (appSwitcher) {
        appSwitcher.hidden = !BRAND.html.appSwitcher;
        customizeAppSwitcher();
    }
}

// APP SWITCHER customize (attributes work even before AppSwitcher.js upgrades the element)
function customizeAppSwitcher() {
    const { domain, apps, urls, docsUrl } = BRAND.appSwitcher || {};
    if (typeof domain === 'string' && domain.trim()) appSwitcher.setAttribute('domain', domain.trim());
    const appList = Array.isArray(apps) ? apps.join(',') : apps;
    if (typeof appList === 'string' && appList.trim()) appSwitcher.setAttribute('apps', appList);
    if (urls && typeof urls === 'object') appSwitcher.setAttribute('urls', JSON.stringify(urls));
    if (typeof docsUrl === 'string') appSwitcher.setAttribute('docs-url', docsUrl.trim());
}

// ELEMENT display mode
function elementDisplay(element, display, mode = 'block') {
    if (!element) return;
    element.style.display = display ? mode : 'none';
}

// APP customize
function customizeApp() {
    if (appTitle && BRAND.app?.title) {
        appTitle.innerHTML = BRAND.app?.title;
    }
    if (appDescription && BRAND.app?.description) {
        appDescription.textContent = BRAND.app.description;
    }
    if (joinDescription && BRAND.app?.joinDescription) {
        joinDescription.innerHTML = BRAND.app.joinDescription;
    }
    if (joinRoomBtn && BRAND.app?.joinButtonLabel) {
        joinRoomBtn.innerText = BRAND.app.joinButtonLabel;
    }
    if (customizeRoomBtn && BRAND.app?.customizeButtonLabel) {
        customizeRoomBtn.innerText = BRAND.app.customizeButtonLabel;
    }
    if (joinLastLabel && BRAND.app?.joinLastLabel) {
        joinLastLabel.innerText = BRAND.app.joinLastLabel;
    }
}

// WIDGET customize
function customizeWidget() {
    if (BRAND.widget?.enabled) {
        const domain = window.location.host;
        const roomId = BRAND.widget?.roomId || 'support-room';
        const userName = 'guest-' + Math.floor(Math.random() * 10000);
        if (typeof SepehrWidget !== 'undefined') {
            new SepehrWidget(domain, roomId, userName, BRAND.widget);
        } else {
            console.warn('SepehrWidget is not defined in the current context. Please check Widget.js loading.', {
                domain,
                roomId,
                userName,
                widget: BRAND.widget,
            });
        }
    }
}

// SITE metadata
function customizeSite() {
    if (title && BRAND.site?.title) {
        title.textContent = BRAND.site?.title;
    }
    if (icon && BRAND.site?.icon) {
        icon.href = BRAND.site?.icon;
    }
    if (appleTouchIcon && BRAND.site?.appleTouchIcon) {
        appleTouchIcon.href = BRAND.site.appleTouchIcon;
    }
    if (newRoomTitle && BRAND.site?.newRoomTitle) {
        newRoomTitle.innerHTML = BRAND.site?.newRoomTitle;
    }
    if (newRoomDescription && BRAND.site?.newRoomDescription) {
        newRoomDescription.textContent = BRAND.site.newRoomDescription;
    }
}

// SEO metadata
function customizeMetaTags() {
    if (description && BRAND.meta?.description) {
        description.content = BRAND.meta.description;
    }
    if (keywords && BRAND.meta?.keywords) {
        keywords.content = BRAND.meta.keywords;
    }
}

function customizeWhoAreYou() {
    if (waitingRoomHeading && title && BRAND.whoAreYou?.title) title.textContent = BRAND.whoAreYou.title;
    if (waitingRoomHeading && BRAND.whoAreYou?.waitingRoomHeading)
        waitingRoomHeading.textContent = BRAND.whoAreYou.waitingRoomHeading;
    if (waitingRoomDescription && BRAND.whoAreYou?.waitingRoomDescription)
        waitingRoomDescription.innerHTML = BRAND.whoAreYou.waitingRoomDescription;
    if (waitingRoomStatus && BRAND.whoAreYou?.waitingRoomStatus)
        waitingRoomStatus.textContent = BRAND.whoAreYou.waitingRoomStatus;
    if (waitingRoomHostLink && BRAND.whoAreYou?.waitingRoomHostLink)
        waitingRoomHostLink.textContent = BRAND.whoAreYou.waitingRoomHostLink;
    if (waitingRoomLoginLink && BRAND.whoAreYou?.waitingRoomLoginLink)
        waitingRoomLoginLink.textContent = BRAND.whoAreYou.waitingRoomLoginLink;
}

function customizeLogin() {
    if (loginHeading && BRAND.login?.heading) loginHeading.textContent = BRAND.login.heading;
    if (loginDescription && BRAND.login?.description) loginDescription.textContent = BRAND.login.description;
    if (BRAND.login?.buttonLabel) {
        const loginBtnText = document.getElementById('loginBtnText');
        if (loginBtnText) {
            loginBtnText.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i>&nbsp; ' + BRAND.login.buttonLabel;
        } else if (loginButton) {
            loginButton.textContent = BRAND.login.buttonLabel;
        }
    }
}

initialize();
