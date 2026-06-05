import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RATES_PATH = path.join(ROOT, "src", "rates.js");
const STATE_DIR = path.join(ROOT, "var");
const STATE_PATH = path.join(STATE_DIR, "policy-watch-state.json");
const LOG_PATH = path.join(STATE_DIR, "policy-watch.log");
const TODAY = new Date().toISOString().slice(0, 10);
const USER_AGENT = "SkuROI policy watcher/1.0 (+https://skuroi.com)";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_FETCH = args.has("--skip-fetch");

const POLICY_SOURCES = [
  {
    id: "shopify-pricing",
    market: "shopify_us",
    label: "Shopify pricing",
    url: "https://www.shopify.com/pricing"
  },
  {
    id: "shopify-card-rates",
    market: "shopify_us",
    label: "Shopify Payments card rates",
    url: "https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates"
  },
  {
    id: "tiktok-referral-fees",
    market: "tiktok_shop_us",
    label: "TikTok Shop referral fee updates",
    url: "https://seller-us.tiktok.com/university/essay?knowledge_id=5982454398175018"
  },
  {
    id: "amazon-fee-update",
    market: "amazon_fba_us_lite",
    label: "Amazon standard selling fees",
    url: "https://sell.amazon.com/pricing"
  }
];

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function logLine(message) {
  ensureStateDir();
  const line = `${new Date().toISOString()} ${message}`;
  fs.appendFileSync(LOG_PATH, `${line}\n`);
  console.log(line);
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    logLine(`state unreadable; starting fresh: ${error.message}`);
    return {};
  }
}

function writeState(state) {
  ensureStateDir();
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&cent;/gi, " cents")
    .replace(/&#x2F;/gi, "/");
}

function htmlToText(html) {
  const decoded = decodeHtmlEntities(html);
  const withMetaContent = decoded.replace(/<meta\b[^>]*\bcontent=(["'])([\s\S]*?)\1[^>]*>/gi, " $2 ");

  return normalizeWhitespace(
    withMetaContent
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cloneRates() {
  delete require.cache[require.resolve(RATES_PATH)];
  return JSON.parse(JSON.stringify(require(RATES_PATH)));
}

function moneyToNumber(raw) {
  const value = String(raw ?? "").toLowerCase().trim();
  if (value.includes("¢") || value.includes("cent")) {
    const cents = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(cents) ? roundRate(cents / 100) : null;
  }

  const dollars = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(dollars) ? roundRate(dollars) : null;
}

function percentToRate(raw) {
  const value = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? roundRate(value / 100) : null;
}

function roundRate(value) {
  return Number(Number(value).toFixed(6));
}

function deepGet(object, pathParts) {
  return pathParts.reduce((current, key) => current?.[key], object);
}

function deepSet(object, pathParts, value) {
  const last = pathParts.at(-1);
  const target = pathParts.slice(0, -1).reduce((current, key) => current[key], object);
  target[last] = value;
}

function compactSnippet(value) {
  return normalizeWhitespace(value).slice(0, 240);
}

function windowAround(text, index, before = 220, after = 420) {
  return text.slice(Math.max(0, index - before), Math.min(text.length, index + after));
}

function findFirstPercentAfter(text, label, options = {}) {
  const { requireAny = [], before = 120, after = 480 } = options;
  const lowerText = text.toLowerCase();
  const lowerLabel = label.toLowerCase();
  let start = 0;

  while (start < text.length) {
    const index = lowerText.indexOf(lowerLabel, start);
    if (index < 0) {
      return null;
    }

    const snippet = windowAround(text, index, before, after);
    const lowerSnippet = snippet.toLowerCase();
    start = index + lowerLabel.length;

    if (requireAny.length && !requireAny.some((word) => lowerSnippet.includes(word.toLowerCase()))) {
      continue;
    }

    const match = snippet.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) {
      continue;
    }

    return {
      value: percentToRate(match[1]),
      evidence: compactSnippet(snippet)
    };
  }

  return null;
}

function findPlanBlock(text, planLabel, nextPlanLabel) {
  const start = findWholeWordIndex(text, planLabel);
  if (start < 0) {
    return null;
  }

  const next = nextPlanLabel ? findWholeWordIndex(text, nextPlanLabel, start + planLabel.length) : -1;
  const end = next > start ? next : start + 6000;
  return text.slice(start, Math.min(text.length, end));
}

function findWholeWordIndex(text, label, start = 0) {
  const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, "gi");
  pattern.lastIndex = start;
  const match = pattern.exec(text);
  return match ? match.index : -1;
}

function extractShopify(texts) {
  const text = htmlToText(texts.join(" "));
  const signals = [];
  const statuses = [];
  const planOrder = [
    ["basic", "Basic", "Grow"],
    ["grow", "Grow", "Advanced"],
    ["advanced", "Advanced", null]
  ];

  for (const [plan, label, nextLabel] of planOrder) {
    const block = findPlanBlock(text, label, nextLabel);
    if (!block) {
      statuses.push(`Shopify ${label}: plan block not found`);
      continue;
    }

    const cardMatch = block.match(/(\d+(?:\.\d+)?)\s*%\s*\+\s*(?:(?:US)?\$?\s*)?(\d+(?:\.\d+)?\s*(?:¢|cents?)?|\d+(?:\.\d+)?)/i);
    if (cardMatch) {
      signals.push({
        path: ["markets", "shopify_us", "plans", plan, "payments", "standardCard", "rate"],
        value: percentToRate(cardMatch[1]),
        evidence: compactSnippet(cardMatch.input.slice(Math.max(0, cardMatch.index - 80), cardMatch.index + 160))
      });
      signals.push({
        path: ["markets", "shopify_us", "plans", plan, "payments", "standardCard", "fixed"],
        value: moneyToNumber(cardMatch[2]),
        evidence: compactSnippet(cardMatch.input.slice(Math.max(0, cardMatch.index - 80), cardMatch.index + 160))
      });
    } else {
      statuses.push(`Shopify ${label}: standard card rate not parsed`);
    }

    statuses.push(`Shopify ${label}: third-party gateway rate skipped because page text is ambiguous`);
  }

  return {
    market: "shopify_us",
    signals,
    status: statuses.length ? statuses.join("; ") : "parsed Shopify pricing signals"
  };
}

function extractTikTok(texts) {
  const text = htmlToText(texts.join(" "));
  const signals = [];
  const statuses = [];
  const referral = findFirstPercentAfter(text, "referral fee", { requireAny: ["TikTok"], after: 600 });
  if (referral) {
    signals.push({
      path: ["markets", "tiktok_shop_us", "defaults", "referralFeeRate"],
      value: referral.value,
      evidence: referral.evidence
    });
  } else {
    statuses.push("TikTok referral fee not parsed from public page");
  }

  return {
    market: "tiktok_shop_us",
    signals,
    status: statuses.join("; ") || "parsed TikTok signals"
  };
}

function extractAmazon(texts) {
  const text = htmlToText(texts.join(" "));
  const rules = [
    ["Consumer Electronics", ["markets", "amazon_fba_us_lite", "referralFees", "electronics", "rate"]],
    ["Home and Kitchen", ["markets", "amazon_fba_us_lite", "referralFees", "home_kitchen", "rate"]]
  ];
  const signals = [];
  const statuses = [];

  for (const [label, pathParts] of rules) {
    const found = findFirstPercentAfter(text, label, { before: 0, after: 800 });
    if (found) {
      signals.push({
        path: pathParts,
        value: found.value,
        evidence: found.evidence
      });
    } else {
      statuses.push(`Amazon ${label}: referral rate not parsed`);
    }
  }

  return {
    market: "amazon_fba_us_lite",
    signals,
    status: statuses.join("; ") || "parsed Amazon single-rate referral signals; skipped tiered apparel rates"
  };
}

async function fetchSource(source) {
  const curlResult = fetchSourceWithCurl(source);
  if (curlResult.ok) {
    return curlResult;
  }

  const fetchResult = await fetchSourceWithNode(source);
  if (fetchResult.ok) {
    return fetchResult;
  }

  return {
    ...fetchResult,
    error: `curl: ${curlResult.error}; fetch: ${fetchResult.error}`
  };
}

async function fetchSourceWithNode(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": USER_AGENT
      }
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        ...source,
        ok: false,
        status: response.status,
        finalUrl: response.url,
        hash: null,
        text: "",
        error: `HTTP ${response.status}`
      };
    }

    return {
      ...source,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      hash: sha256(htmlToText(body)),
      text: body
    };
  } catch (error) {
    return {
      ...source,
      ok: false,
      status: "FETCH_ERROR",
      finalUrl: source.url,
      hash: null,
      text: "",
      error: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

function fetchSourceWithCurl(source) {
  const marker = "\n__SKUROI_CURL_META__";

  try {
    const output = execFileSync("curl", [
      "-L",
      "-sS",
      "--max-time",
      "25",
      "-A",
      USER_AGENT,
      "-H",
      "Accept-Language: en-US,en;q=0.9",
      "-w",
      `${marker}%{http_code} %{url_effective}`,
      source.url
    ], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const markerIndex = output.lastIndexOf(marker);
    const body = markerIndex >= 0 ? output.slice(0, markerIndex) : output;
    const meta = markerIndex >= 0 ? output.slice(markerIndex + marker.length).trim() : "";
    const statusMatch = meta.match(/^(\d{3})\s+(.*)$/);
    const status = statusMatch ? Number(statusMatch[1]) : "CURL";
    const finalUrl = statusMatch ? statusMatch[2] : source.url;
    const ok = typeof status === "number" ? status >= 200 && status < 400 : Boolean(body);

    return {
      ...source,
      ok,
      status,
      finalUrl,
      hash: ok ? sha256(htmlToText(body)) : null,
      text: ok ? body : "",
      error: ok ? undefined : `HTTP ${status}`
    };
  } catch (error) {
    return {
      ...source,
      ok: false,
      status: "FETCH_ERROR",
      finalUrl: source.url,
      hash: null,
      text: "",
      error: error.message
    };
  }
}

function buildExtractionResults(fetchResults) {
  const byMarket = new Map();
  for (const result of fetchResults) {
    if (!result.ok) {
      continue;
    }

    const existing = byMarket.get(result.market) || [];
    existing.push(result.text);
    byMarket.set(result.market, existing);
  }

  return [
    extractShopify(byMarket.get("shopify_us") || []),
    extractTikTok(byMarket.get("tiktok_shop_us") || []),
    extractAmazon(byMarket.get("amazon_fba_us_lite") || [])
  ];
}

function applySignals(rates, extractionResults) {
  const changes = [];
  const verifiedMarkets = new Set();

  for (const result of extractionResults) {
    for (const signal of result.signals) {
      if (signal.value === null || !Number.isFinite(signal.value)) {
        continue;
      }

      const current = deepGet(rates, signal.path);
      if (typeof current !== "number") {
        continue;
      }

      if (Math.abs(current - signal.value) > 0.000001) {
        deepSet(rates, signal.path, signal.value);
        changes.push({
          path: signal.path.join("."),
          from: current,
          to: signal.value,
          evidence: signal.evidence
        });
      }

      verifiedMarkets.add(result.market);
    }
  }

  if (changes.length) {
    rates.version = TODAY;
    for (const market of verifiedMarkets) {
      if (rates.markets?.[market]) {
        rates.markets[market].lastVerifiedAt = TODAY;
      }
    }
  }

  return changes;
}

function renderString(value) {
  return JSON.stringify(value);
}

function renderSources(sources, indent) {
  const pad = " ".repeat(indent);
  const innerPad = " ".repeat(indent + 2);
  return `[\n${sources
    .map((source) => `${innerPad}{\n${innerPad}  label: ${renderString(source.label)},\n${innerPad}  url: ${renderString(source.url)}\n${innerPad}}`)
    .join(",\n")}\n${pad}]`;
}

function renderNotes(notes, indent) {
  const pad = " ".repeat(indent);
  const innerPad = " ".repeat(indent + 2);
  return `[\n${notes.map((note) => `${innerPad}${renderString(note)}`).join(",\n")}\n${pad}]`;
}

function renderPayment(payment) {
  return `{ label: ${renderString(payment.label)}, rate: ${payment.rate}, fixed: ${payment.fixed} }`;
}

function renderReferralFee(fee) {
  return `{ label: ${renderString(fee.label)}, rate: ${fee.rate} }`;
}

function renderRates(rates) {
  const shopify = rates.markets.shopify_us;
  const tiktok = rates.markets.tiktok_shop_us;
  const amazon = rates.markets.amazon_fba_us_lite;

  return `(function attachRates(root, factory) {
  const rates = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = rates;
  }

  root.SALES_CALC_RATES = rates;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRates() {
  return {
    version: ${renderString(rates.version)},
    currency: ${renderString(rates.currency)},
    markets: {
      shopify_us: {
        label: ${renderString(shopify.label)},
        lastVerifiedAt: ${renderString(shopify.lastVerifiedAt)},
        sources: ${renderSources(shopify.sources, 8)},
        plans: {
          basic: {
            label: ${renderString(shopify.plans.basic.label)},
            payments: {
              standardCard: ${renderPayment(shopify.plans.basic.payments.standardCard)},
              premiumCard: ${renderPayment(shopify.plans.basic.payments.premiumCard)},
              internationalCard: ${renderPayment(shopify.plans.basic.payments.internationalCard)},
              thirdParty: ${renderPayment(shopify.plans.basic.payments.thirdParty)}
            }
          },
          grow: {
            label: ${renderString(shopify.plans.grow.label)},
            payments: {
              standardCard: ${renderPayment(shopify.plans.grow.payments.standardCard)},
              premiumCard: ${renderPayment(shopify.plans.grow.payments.premiumCard)},
              internationalCard: ${renderPayment(shopify.plans.grow.payments.internationalCard)},
              thirdParty: ${renderPayment(shopify.plans.grow.payments.thirdParty)}
            }
          },
          advanced: {
            label: ${renderString(shopify.plans.advanced.label)},
            payments: {
              standardCard: ${renderPayment(shopify.plans.advanced.payments.standardCard)},
              premiumCard: ${renderPayment(shopify.plans.advanced.payments.premiumCard)},
              internationalCard: ${renderPayment(shopify.plans.advanced.payments.internationalCard)},
              thirdParty: ${renderPayment(shopify.plans.advanced.payments.thirdParty)}
            }
          }
        },
        notes: ${renderNotes(shopify.notes, 8)}
      },
      tiktok_shop_us: {
        label: ${renderString(tiktok.label)},
        lastVerifiedAt: ${renderString(tiktok.lastVerifiedAt)},
        sources: ${renderSources(tiktok.sources, 8)},
        defaults: {
          referralFeeRate: ${tiktok.defaults.referralFeeRate},
          processingFeeRate: ${tiktok.defaults.processingFeeRate},
          processingFixedFee: ${tiktok.defaults.processingFixedFee},
          affiliateCommissionRate: ${tiktok.defaults.affiliateCommissionRate}
        },
        notes: ${renderNotes(tiktok.notes, 8)}
      },
      amazon_fba_us_lite: {
        label: ${renderString(amazon.label)},
        lastVerifiedAt: ${renderString(amazon.lastVerifiedAt)},
        sources: ${renderSources(amazon.sources, 8)},
        referralFees: {
          electronics: ${renderReferralFee(amazon.referralFees.electronics)},
          home_kitchen: ${renderReferralFee(amazon.referralFees.home_kitchen)},
          apparel_default: ${renderReferralFee(amazon.referralFees.apparel_default)}
        },
        notes: ${renderNotes(amazon.notes, 8)}
      }
    }
  };
});
`;
}

function gitArgs() {
  if (process.env.SALES_CALC_GIT_DIR) {
    return ["--git-dir", process.env.SALES_CALC_GIT_DIR, "--work-tree", ROOT];
  }

  const dotGit = path.join(ROOT, ".git");
  if (fs.existsSync(dotGit) && fs.readdirSync(dotGit).length > 0) {
    return ["-C", ROOT];
  }

  if (fs.existsSync("/tmp/salescalc.git")) {
    return ["--git-dir", "/tmp/salescalc.git", "--work-tree", ROOT];
  }

  return ["-C", ROOT];
}

function gitOutput(args) {
  return execFileSync("git", [...gitArgs(), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function gitRun(args) {
  execFileSync("git", [...gitArgs(), ...args], {
    cwd: ROOT,
    stdio: "inherit"
  });
}

function trackedStatus() {
  return gitOutput(["status", "--porcelain", "--untracked-files=no"]);
}

function runProjectChecks() {
  execFileSync("npm", ["test"], { cwd: ROOT, stdio: "inherit" });
  execFileSync("npm", ["run", "build:locales"], { cwd: ROOT, stdio: "inherit" });
}

function commitAndPush(changes) {
  const status = trackedStatus();
  if (!status) {
    logLine("no tracked file diff after update; no commit created");
    return false;
  }

  gitRun(["add", "-u"]);
  gitRun(["commit", "-m", `Update platform fee assumptions ${TODAY}`]);
  gitRun(["push"]);
  logLine(`pushed ${changes.length} policy numeric change(s)`);
  return true;
}

async function main() {
  const state = readState();
  const rates = cloneRates();
  const beforeStatus = trackedStatus();

  if (beforeStatus && !DRY_RUN) {
    throw new Error(`tracked worktree is not clean; refusing to auto-commit unrelated changes:\n${beforeStatus}`);
  } else if (beforeStatus) {
    logLine("tracked worktree is dirty; continuing because dry run is enabled");
  }

  const fetchResults = SKIP_FETCH
    ? POLICY_SOURCES.map((source) => ({ ...source, ok: false, status: "SKIPPED", finalUrl: source.url, hash: null, text: "" }))
    : await Promise.all(POLICY_SOURCES.map(fetchSource));

  const failedFetches = fetchResults.filter((result) => !result.ok);
  for (const result of failedFetches) {
    logLine(`${result.id} fetch unavailable (${result.status}${result.error ? `: ${result.error}` : ""})`);
  }

  const extractionResults = buildExtractionResults(fetchResults);
  const changes = applySignals(rates, extractionResults);
  const nextState = {
    checkedAt: new Date().toISOString(),
    version: rates.version,
    sources: fetchResults.map((result) => ({
      id: result.id,
      market: result.market,
      label: result.label,
      url: result.url,
      finalUrl: result.finalUrl,
      ok: result.ok,
      status: result.status,
      hash: result.hash,
      changedSinceLastCheck: Boolean(result.hash && state.sourcesById?.[result.id]?.hash && state.sourcesById[result.id].hash !== result.hash),
      error: result.error || undefined
    })),
    extractions: extractionResults.map((result) => ({
      market: result.market,
      parsedSignalCount: result.signals.length,
      status: result.status
    })),
    lastChanges: changes.map((change) => ({
      path: change.path,
      from: change.from,
      to: change.to
    })),
    sourcesById: Object.fromEntries(
      fetchResults.map((result) => [
        result.id,
        {
          hash: result.hash,
          checkedAt: new Date().toISOString(),
          status: result.status
        }
      ])
    )
  };

  if (!changes.length) {
    if (!DRY_RUN) {
      writeState(nextState);
    }
    const parsed = extractionResults.map((result) => `${result.market}: ${result.signals.length}`).join(", ");
    const fetched = `${fetchResults.length - failedFetches.length}/${fetchResults.length}`;
    logLine(`no numeric policy changes detected; no git push (fetched ${fetched}; ${parsed})`);
    return;
  }

  logLine(`detected ${changes.length} numeric policy change(s)`);
  for (const change of changes) {
    logLine(`${change.path}: ${change.from} -> ${change.to}; evidence: ${change.evidence}`);
  }

  if (DRY_RUN) {
    logLine("dry run enabled; leaving files, git, and state unchanged");
    return;
  }

  fs.writeFileSync(RATES_PATH, renderRates(rates));
  runProjectChecks();
  commitAndPush(changes);
  writeState(nextState);
}

main().catch((error) => {
  logLine(`policy update failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
