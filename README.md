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

## Local Policy Watch

The repository includes a local watcher for Shopify, TikTok Shop, and Amazon fee-policy pages.

Daily behavior:

- Fetch the configured policy source pages.
- Extract only known numeric fee signals.
- Compare extracted numbers with `src/rates.js`.
- If no numeric value changed, write local state/logs only and do not push.
- If a numeric value changed, update `src/rates.js`, run tests and locale build, commit, and push to GitHub.

This keeps Cloudflare Pages builds low because GitHub is pushed only when tracked files actually change.

Manual dry run:

```bash
npm run policy:check
```

Manual update run:

```bash
npm run policy:update
```

Install the daily cron job:

```bash
SALES_CALC_POLICY_TIME=09:30 npm run policy:install-cron
```

For this workspace, the Git metadata is stored outside the project folder. Install cron with:

```bash
SALES_CALC_POLICY_TIME=09:30 SALES_CALC_GIT_DIR=/tmp/salescalc.git npm run policy:install-cron
```

Preview the cron entry without installing:

```bash
SALES_CALC_POLICY_TIME=09:30 SALES_CALC_GIT_DIR=/tmp/salescalc.git bash scripts/install-policy-cron.sh --print
```

Local state and logs are ignored by git:

- `var/policy-watch-state.json`
- `var/policy-watch.log`
- `var/policy-watch-run.log`

The watcher refuses to run if tracked files are already dirty, so it cannot accidentally commit unrelated local edits. Public policy pages can be blocked or reformatted; when a page hash changes but the numeric parser cannot verify a changed fee, the watcher logs the condition and skips pushing.

## Disclaimer

SkuROI provides planning estimates only. Actual platform payouts, fees, taxes, promotions, refunds, and account-specific adjustments can differ.
