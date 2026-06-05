# SkuROI

Static SKU profit and ROI calculator for Shopify, TikTok Shop, and Amazon FBA Lite.

Production domain:

```txt
https://skuroi.com
```

## Local Preview

This project has no build step.

```bash
python3 -m http.server 8000
```

Open:

```txt
http://localhost:8000
```

## Tests

```bash
npm test
```

The tests use Node's built-in test runner and do not require package installation.

## Cloudflare Pages

Use the GitHub repository as the Pages source.

- Build command: leave empty
- Build output directory: `.` or `/` for the repository root
- Framework preset: None

The calculator is fully static. Cloudflare Pages can serve the repository root directly.

Recommended custom domain setup:

1. Open Cloudflare Dashboard.
2. Go to `Workers & Pages`.
3. Select the `skuroi` Pages project.
4. Open `Custom domains`.
5. Add `skuroi.com`.
6. Add `www.skuroi.com` and redirect it to `https://skuroi.com`.
7. Set SSL/TLS mode to `Full`.
8. Enable `Always Use HTTPS`.

## Google Search and SEO

After production deployment:

1. Open Google Search Console.
2. Add a Domain property for `skuroi.com`.
3. Verify ownership with the DNS TXT record Google provides.
4. Submit `https://skuroi.com/sitemap.xml`.
5. Use URL Inspection for `https://skuroi.com/` and request indexing.
6. Monitor indexing, impressions, clicks, and queries weekly.

Baseline SEO checklist:

- Keep `title`, `description`, canonical, Open Graph, and WebApplication schema aligned with the domain.
- Keep default fee assumptions source-backed and editable.
- Do not publish AI-generated bulk landing pages without manual review and real calculator value.
- Add future pages only when they target a distinct search intent.

## Fee Data

Default fee assumptions live in `src/rates.js`.

Rules:

- Keep every default fee editable in the UI.
- Keep each source URL close to the fee data.
- Update `lastVerifiedAt` when fee data is reviewed.
- Do not represent Amazon FBA Lite as ASIN-level exact accounting.

## Disclaimer

SkuROI provides planning estimates only. Actual platform payouts, fees, taxes, promotions, refunds, and account-specific adjustments can differ.
