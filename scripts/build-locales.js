const fs = require("node:fs");
const path = require("node:path");
const { locales, translations } = require("../src/i18n.js");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://skuroi.com";
const TEMPLATE_PATH = path.join(ROOT, "index.html");
const TODAY = new Date().toISOString().slice(0, 10);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localeUrl(locale) {
  return `${SITE_URL}${locales[locale].path}`;
}

function allAlternateLinks() {
  const links = [
    { hreflang: "x-default", href: localeUrl("en") },
    ...Object.entries(locales).map(([locale, info]) => ({
      hreflang: info.lang,
      href: localeUrl(locale)
    }))
  ];

  return links
    .map((link) => `    <link rel="alternate" hreflang="${link.hreflang}" href="${link.href}">`)
    .join("\n");
}

function replaceMeta(html, attrName, attrValue, content) {
  const pattern = new RegExp(
    `(<meta\\s+(?=[^>]*\\b${attrName}="${escapeRegExp(attrValue)}")[^>]*\\bcontent=")[^"]*(")`,
    "i"
  );
  return html.replace(pattern, `$1${escapeHtml(content)}$2`);
}

function replaceScriptJson(html, id, payload) {
  const json = JSON.stringify(payload, null, 8).replaceAll("<", "\\u003c");
  const pattern = new RegExp(`(<script id="${id}" type="application/ld\\+json">)[\\s\\S]*?(</script>)`);
  return html.replace(pattern, `$1\n      ${json.split("\n").join("\n      ")}\n    $2`);
}

function replaceStaticText(html, messages) {
  let next = html;

  Object.entries(messages).forEach(([key, value]) => {
    const pattern = new RegExp(
      `(<([a-z0-9]+)\\b(?=[^>]*\\bdata-i18n="${escapeRegExp(key)}")[^>]*>)[\\s\\S]*?(</\\2>)`,
      "gi"
    );
    next = next.replace(pattern, `$1${escapeHtml(value)}$3`);
  });

  Object.entries(messages).forEach(([key, value]) => {
    const pattern = new RegExp(
      `(<[a-z0-9]+\\b(?=[^>]*\\sdata-i18n-aria-label="${escapeRegExp(key)}")[^>]*\\saria-label=")[^"]*(")`,
      "gi"
    );
    next = next.replace(pattern, `$1${escapeHtml(value)}$2`);
  });

  return next;
}

function localizedHtml(locale, template) {
  const info = locales[locale];
  const messages = translations[locale];
  const url = localeUrl(locale);
  let html = template;

  html = html.replace(/<html lang="[^"]+" data-locale="[^"]+">/, `<html lang="${info.lang}" data-locale="${locale}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(messages.metaTitle)}</title>`);
  html = replaceMeta(html, "name", "description", messages.metaDescription);
  html = replaceMeta(html, "property", "og:title", messages.metaTitle);
  html = replaceMeta(html, "property", "og:description", messages.metaDescription);
  html = replaceMeta(html, "name", "twitter:title", messages.metaTitle);
  html = replaceMeta(html, "name", "twitter:description", messages.twitterDescription);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/    <link rel="alternate" hreflang="x-default"[\s\S]*?    <meta property="og:title"/, `${allAlternateLinks()}\n    <meta property="og:title"`);
  html = replaceStaticText(html, messages);
  html = replaceScriptJson(html, "schema-app", {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: messages.appName,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  });
  html = replaceScriptJson(html, "schema-faq", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: messages.faqCalcTitle,
        acceptedAnswer: {
          "@type": "Answer",
          text: messages.faqCalcBody
        }
      },
      {
        "@type": "Question",
        name: messages.faqFeesTitle,
        acceptedAnswer: {
          "@type": "Answer",
          text: messages.faqFeesBody
        }
      },
      {
        "@type": "Question",
        name: messages.faqSavedTitle,
        acceptedAnswer: {
          "@type": "Answer",
          text: messages.faqSavedBody
        }
      }
    ]
  });

  return html;
}

function writeLocalePage(locale, html) {
  const outputPath = locale === "en"
    ? path.join(ROOT, "index.html")
    : path.join(ROOT, locale, "index.html");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${html.trimEnd()}\n`);
}

function sitemapLinks() {
  const links = [
    { hreflang: "x-default", href: localeUrl("en") },
    ...Object.entries(locales).map(([locale, info]) => ({
      hreflang: info.lang,
      href: localeUrl(locale)
    }))
  ];

  return links
    .map((link) => `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${link.href}" />`)
    .join("\n");
}

function writeSitemap() {
  const urls = Object.keys(locales)
    .map((locale) => `  <url>
    <loc>${localeUrl(locale)}</loc>
    <lastmod>${TODAY}</lastmod>
${sitemapLinks()}
  </url>`)
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  Object.keys(locales).forEach((locale) => {
    writeLocalePage(locale, localizedHtml(locale, template));
  });
  writeSitemap();
}

main();
