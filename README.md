# SalesCalc

Static eCommerce profit calculator for Shopify, TikTok Shop, and Amazon FBA Lite.

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

## Fee Data

Default fee assumptions live in `src/rates.js`.

Rules:

- Keep every default fee editable in the UI.
- Keep each source URL close to the fee data.
- Update `lastVerifiedAt` when fee data is reviewed.
- Do not represent Amazon FBA Lite as ASIN-level exact accounting.

## Disclaimer

SalesCalc provides planning estimates only. Actual platform payouts, fees, taxes, promotions, refunds, and account-specific adjustments can differ.
