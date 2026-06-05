(function startApp() {
  const i18nApi = window.SkuROII18N;
  const locales = i18nApi.locales;
  const translations = i18nApi.translations;
  const html = document.documentElement;
  const LOCALE_STORAGE_KEY = "skuroi.locale.choice.v1";

  function localeFromPath() {
    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    return firstSegment && locales[firstSegment] ? firstSegment : "en";
  }

  function getStoredLocaleChoice() {
    try {
      const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      return value && locales[value] ? value : "";
    } catch (error) {
      return "";
    }
  }

  function browserLocaleMatch(language) {
    const normalized = String(language || "").toLowerCase().replace("_", "-");

    if (!normalized) {
      return "";
    }

    if (normalized.startsWith("zh")) {
      return /hant|tw|hk|mo/.test(normalized) ? "zh-tw" : "zh-cn";
    }

    const base = normalized.split("-")[0];
    return ["ja", "ko", "es", "fr", "de", "it"].includes(base) ? base : "";
  }

  function preferredBrowserLocale() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

    for (const language of languages) {
      const match = browserLocaleMatch(language);

      if (match) {
        return match;
      }
    }

    return "en";
  }

  function maybeRedirectForBrowserLocale() {
    const path = window.location.pathname;
    const isRootPage = path === "/" || path === "/index.html";
    const manualLocale = getStoredLocaleChoice();
    const browserLocale = preferredBrowserLocale();
    const targetLocale = manualLocale || browserLocale;

    if (!isRootPage || targetLocale === "en") {
      return false;
    }

    const target = locales[targetLocale];
    const url = new URL(target.path, window.location.origin);
    url.search = window.location.search;
    url.hash = window.location.hash;
    window.location.replace(url.href);
    return true;
  }

  if (maybeRedirectForBrowserLocale()) {
    return;
  }

  const currentLocale = html.dataset.locale && locales[html.dataset.locale]
    ? html.dataset.locale
    : localeFromPath();
  const currentLocaleInfo = locales[currentLocale] || locales.en;
  const messages = translations[currentLocale] || translations.en;
  const fallbackMessages = translations.en;
  const rates = window.SALES_CALC_RATES;
  const calc = window.SalesCalc;
  const form = document.getElementById("calculatorForm");
  const resultHost = document.getElementById("platformResults");
  const bestPlatform = document.getElementById("bestPlatform");
  const bestProfit = document.getElementById("bestProfit");
  const bestMargin = document.getElementById("bestMargin");
  const sourceList = document.getElementById("sourceList");
  const resetButton = document.getElementById("resetForm");
  const clearSavedButton = document.getElementById("clearSaved");
  const shareButton = document.getElementById("shareConfig");
  const exportButton = document.getElementById("exportData");
  const exportMenu = document.getElementById("exportMenu");
  const exportPdfButton = document.getElementById("exportPdf");
  const exportCsvButton = document.getElementById("exportCsv");
  const languageSelect = document.getElementById("languageSelect");
  const saveStatus = document.getElementById("saveStatus");
  const fulfillmentModeNote = document.getElementById("fulfillmentModeNote");
  const STORAGE_KEY = "skuroi.calculator.inputs.v1";
  const SHARE_KEYS = {
    fulfillmentMode: "fm",
    sellingPrice: "p",
    productCost: "pc",
    inboundShipping: "is",
    customerShipping: "cs",
    sellerShipping: "ss",
    returnRate: "rr",
    returnLoss: "rl",
    otherCosts: "oc",
    shopifyPlan: "sp",
    shopifyPayment: "pm",
    shopifyCac: "sc",
    shopifyAppCost: "sa",
    tiktokReferralRate: "tr",
    tiktokAffiliateRate: "ta",
    tiktokAdsCost: "tc",
    tiktokProcessingRate: "tpr",
    tiktokProcessingFixed: "tpf",
    tiktokProcessingEnabled: "tpe",
    supplierProcessingFee: "spf",
    reshipLoss: "rx",
    amazonCategory: "ac",
    amazonReferralRate: "ar",
    amazonFbaFee: "af",
    amazonStorageFee: "as",
    amazonPpcCost: "ap",
    amazonOtherCosts: "ao"
  };
  const SHARE_IDS = Object.fromEntries(
    Object.entries(SHARE_KEYS).map(([id, key]) => [key, id])
  );
  const INPUT_LABEL_KEYS = {
    fulfillmentMode: "fulfillmentMode",
    sellingPrice: "sellingPrice",
    productCost: "productCost",
    inboundShipping: "inboundShipping",
    customerShipping: "customerShipping",
    sellerShipping: "sellerShipping",
    returnRate: "returnRate",
    returnLoss: "returnLoss",
    otherCosts: "otherCost",
    shopifyPlan: "plan",
    shopifyPayment: "paymentMethod",
    shopifyCac: "cacAdCost",
    shopifyAppCost: "appCostPerOrder",
    tiktokReferralRate: "referralFeePct",
    tiktokAffiliateRate: "affiliateCommissionPct",
    tiktokAdsCost: "adsCost",
    tiktokProcessingRate: "processingFeePct",
    tiktokProcessingFixed: "processingFixedFee",
    tiktokProcessingEnabled: "countProcessing",
    supplierProcessingFee: "supplierProcessingFee",
    reshipLoss: "replacementReshipLoss",
    amazonCategory: "category",
    amazonReferralRate: "manualReferralPct",
    amazonFbaFee: "fbaFee",
    amazonStorageFee: "storageFee",
    amazonPpcCost: "ppcCost",
    amazonOtherCosts: "otherAmazonCost"
  };
  const MODE_INPUT_LABEL_KEYS = {
    dropshipping: {
      productCost: "supplierItemCost",
      inboundShipping: "optionalLandedCost",
      sellerShipping: "supplierShippingFulfillment",
      returnRate: "refundDisputeRate",
      returnLoss: "refundDisputeLoss"
    }
  };
  const VALUE_LABEL_KEYS = {
    fulfillmentMode: {
      stocked: "stockedInventory",
      dropshipping: "dropshipping"
    },
    shopifyPlan: {
      basic: "basic",
      grow: "grow",
      advanced: "advanced"
    },
    shopifyPayment: {
      standardCard: "standardCard",
      premiumCard: "premiumCard",
      internationalCard: "internationalCard",
      thirdParty: "thirdPartyGateway"
    },
    amazonCategory: {
      electronics: "electronics",
      home_kitchen: "homeKitchen",
      apparel_default: "apparel",
      manual: "manualReferral"
    }
  };
  const COST_LABEL_KEYS = {
    "Product cost": "productCost",
    "Inbound shipping": "inboundShipping",
    "Seller shipping": "sellerShipping",
    "Payment fee": "paymentFeeLabel",
    "CAC / ads": "cacAdsLabel",
    "App cost": "appCostLabel",
    "Return loss": "returnLoss",
    "Other cost": "otherCost",
    "Referral fee": "referralFeeLabel",
    "Processing fee": "processingFeeLabel",
    "Affiliate commission": "affiliateCommissionLabel",
    "Ads / GMV Max": "adsGmvMaxLabel",
    "FBA fulfillment": "fbaFulfillmentLabel",
    "Storage": "storageLabel",
    "PPC ads": "ppcAdsLabel",
    "Other Amazon cost": "otherAmazonCostLabel",
    "Supplier processing": "supplierProcessingFee",
    "Replacement / reship loss": "replacementReshipLoss"
  };
  const MODE_COST_LABEL_KEYS = {
    dropshipping: {
      "Product cost": "supplierItemCost",
      "Inbound shipping": "optionalLandedCost",
      "Seller shipping": "supplierShippingFulfillment",
      "Return loss": "refundDisputeLoss"
    }
  };
  const MARKET_LABEL_KEYS = {
    shopify_us: "shopifyUs",
    tiktok_shop_us: "tiktokShopUs",
    amazon_fba_us_lite: "amazonFbaLite"
  };

  const defaults = {
    fulfillmentMode: "stocked",
    sellingPrice: 39.99,
    productCost: 12,
    inboundShipping: 3.5,
    customerShipping: 0,
    sellerShipping: 4,
    returnRate: 5,
    returnLoss: 8,
    otherCosts: 0,
    shopifyPlan: "basic",
    shopifyPayment: "standardCard",
    shopifyCac: 8,
    shopifyAppCost: 0,
    tiktokReferralRate: 6,
    tiktokAffiliateRate: 10,
    tiktokAdsCost: 6,
    tiktokProcessingRate: 0,
    tiktokProcessingFixed: 0,
    tiktokProcessingEnabled: false,
    supplierProcessingFee: 0,
    reshipLoss: 0,
    amazonCategory: "electronics",
    amazonReferralRate: 15,
    amazonFbaFee: 4.15,
    amazonStorageFee: 0.2,
    amazonPpcCost: 5,
    amazonOtherCosts: 0
  };
  let activeFulfillmentMode = defaults.fulfillmentMode;

  function t(key) {
    return messages[key] || fallbackMessages[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function money(value) {
    return new Intl.NumberFormat(currentLocaleInfo.lang || "en-US", {
      style: "currency",
      currency: rates.currency,
      maximumFractionDigits: 2
    }).format(Number.isFinite(value) ? value : 0);
  }

  function percent(value) {
    return `${new Intl.NumberFormat(currentLocaleInfo.lang || "en-US", {
      maximumFractionDigits: 2
    }).format(calc.format.pct(value))}%`;
  }

  function dateTime(value) {
    return new Intl.DateTimeFormat(currentLocaleInfo.lang || "en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(value);
  }

  function currentFulfillmentMode() {
    const element = document.getElementById("fulfillmentMode");
    return element && element.value === "dropshipping" ? "dropshipping" : "stocked";
  }

  function setNumberValue(id, nextValue) {
    const element = document.getElementById(id);

    if (element) {
      element.value = String(nextValue);
    }
  }

  function applyFulfillmentModeDefaults(nextMode, previousMode) {
    if (nextMode !== "dropshipping" || previousMode === "dropshipping") {
      return;
    }

    const inbound = document.getElementById("inboundShipping");

    if (inbound && String(inbound.value) === String(defaults.inboundShipping)) {
      setNumberValue("inboundShipping", 0);
    }
  }

  function applyFulfillmentModeUi() {
    const mode = currentFulfillmentMode();

    document.querySelectorAll("[data-mode-stocked-i18n][data-mode-dropshipping-i18n]").forEach((element) => {
      const key = mode === "dropshipping"
        ? element.dataset.modeDropshippingI18n
        : element.dataset.modeStockedI18n;

      if (key) {
        element.textContent = t(key);
      }
    });

    document.querySelectorAll("[data-mode-only]").forEach((element) => {
      element.hidden = element.dataset.modeOnly !== mode;
    });

    if (fulfillmentModeNote) {
      const noteKey = mode === "dropshipping" ? "dropshippingModeNote" : "stockedModeNote";
      fulfillmentModeNote.dataset.i18n = noteKey;
      fulfillmentModeNote.textContent = t(noteKey);
    }
  }

  function number(id) {
    const element = document.getElementById(id);
    const value = Number(element.value);
    return Number.isFinite(value) ? value : 0;
  }

  function checked(id) {
    return document.getElementById(id).checked;
  }

  function value(id) {
    return document.getElementById(id).value;
  }

  function applyStaticTranslations() {
    html.lang = currentLocaleInfo.lang;
    html.dataset.locale = currentLocale;
    document.title = t("metaTitle");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;

      if (key) {
        element.textContent = t(key);
      }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset.i18nAriaLabel;

      if (key) {
        element.setAttribute("aria-label", t(key));
      }
    });
  }

  function setupLanguageSelect() {
    if (!languageSelect) {
      return;
    }

    languageSelect.innerHTML = Object.entries(locales)
      .map(([locale, info]) => `<option value="${locale}">${escapeHtml(info.native)}</option>`)
      .join("");
    languageSelect.value = currentLocale;

    languageSelect.addEventListener("change", () => {
      const nextLocale = languageSelect.value;
      const nextInfo = locales[nextLocale] || locales.en;
      const nextUrl = new URL(nextInfo.path, window.location.origin);
      const params = snapshotToShareParams(getFormSnapshot());
      const query = params.toString();

      if (query && query !== "v=1") {
        nextUrl.search = query;
      }

      nextUrl.hash = window.location.hash;

      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      } catch (error) {
        // Language navigation still works without localStorage.
      }

      window.location.assign(nextUrl.href);
    });
  }

  function getState() {
    return {
      fulfillmentMode: currentFulfillmentMode(),
      sellingPrice: number("sellingPrice"),
      productCost: number("productCost"),
      inboundShipping: number("inboundShipping"),
      customerShipping: number("customerShipping"),
      sellerShipping: number("sellerShipping"),
      returnRate: number("returnRate") / 100,
      returnLoss: number("returnLoss"),
      otherCosts: number("otherCosts"),
      supplierProcessingFee: number("supplierProcessingFee"),
      reshipLoss: number("reshipLoss"),
      shopify: {
        plan: value("shopifyPlan"),
        paymentMethod: value("shopifyPayment"),
        cac: number("shopifyCac"),
        appCost: number("shopifyAppCost")
      },
      tiktok: {
        referralRate: number("tiktokReferralRate") / 100,
        affiliateRate: number("tiktokAffiliateRate") / 100,
        adsCost: number("tiktokAdsCost"),
        processingRate: number("tiktokProcessingRate") / 100,
        processingFixed: number("tiktokProcessingFixed"),
        processingEnabled: checked("tiktokProcessingEnabled")
      },
      amazon: {
        category: value("amazonCategory"),
        referralRate: number("amazonReferralRate") / 100,
        fbaFee: number("amazonFbaFee"),
        storageFee: number("amazonStorageFee"),
        ppcCost: number("amazonPpcCost"),
        otherCosts: number("amazonOtherCosts")
      }
    };
  }

  function setFormValues(values) {
    Object.entries(values).forEach(([id, next]) => {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      if (element.type === "checkbox") {
        element.checked = Boolean(next);
      } else {
        element.value = String(next);
      }
    });
  }

  function setDefaults() {
    setFormValues(defaults);
    activeFulfillmentMode = currentFulfillmentMode();
    applyFulfillmentModeUi();
    render();
  }

  function getFormSnapshot() {
    return Object.fromEntries(
      Object.keys(defaults).map((id) => {
        const element = document.getElementById(id);
        if (!element) {
          return [id, defaults[id]];
        }

        return [id, element.type === "checkbox" ? element.checked : element.value];
      })
    );
  }

  function updateSaveStatus(message) {
    if (!saveStatus) {
      return;
    }

    const text = saveStatus.querySelector(".status-text");
    if (text) {
      text.textContent = message;
    } else {
      saveStatus.textContent = message;
    }
    saveStatus.title = message;
  }

  function saveFormSnapshot() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          values: getFormSnapshot()
        })
      );
      updateSaveStatus(t("savedLocally"));
    } catch (error) {
      updateSaveStatus(t("localSaveUnavailable"));
    }
  }

  function hydrateFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        updateSaveStatus(t("readyToSave"));
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && parsed.values && typeof parsed.values === "object") {
        setFormValues(parsed.values);
        updateSaveStatus(t("restoredLocally"));
      }
    } catch (error) {
      updateSaveStatus(t("savedDataIgnored"));
    }
  }

  function clearSavedData() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // The form reset below still works if localStorage is unavailable.
    }

    setFormValues(defaults);
    activeFulfillmentMode = currentFulfillmentMode();
    applyFulfillmentModeUi();
    render({ persist: false });
    updateSaveStatus(t("savedDataCleared"));
  }

  function localizeCostLabel(label) {
    const modeLabels = MODE_COST_LABEL_KEYS[currentFulfillmentMode()];

    if (modeLabels && modeLabels[label]) {
      return t(modeLabels[label]);
    }

    return t(COST_LABEL_KEYS[label] || label);
  }

  function renderCostBreakdown(result) {
    const max = Math.max(...result.costs.map((item) => item.amount), 1);

    return result.costs
      .map((item) => {
        const width = Math.max(4, Math.round((item.amount / max) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">
              <span>${escapeHtml(localizeCostLabel(item.label))}</span>
              <strong>${escapeHtml(money(item.amount))}</strong>
            </div>
            <div class="bar-track" aria-hidden="true">
              <div class="bar-fill" style="--width:${width}%; --bar-color:${item.color}"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderCard(result) {
    const profitClass = result.netProfit >= 0 ? "positive" : "negative";
    const policyNote = currentFulfillmentMode() === "dropshipping" && result.id === "amazon"
      ? `<p class="note warning-note">${escapeHtml(t("amazonDropshippingNote"))}</p>`
      : "";

    return `
      <article class="platform-card" data-platform="${result.id}">
        <div class="platform-header">
          <div>
            <h3>${escapeHtml(result.label)}</h3>
            <p class="note">${escapeHtml(t("lastVerified"))} ${escapeHtml(result.metadata.lastVerifiedAt)}</p>
          </div>
          <span class="tag">${escapeHtml(result.id === "amazon" ? t("lite") : t("liveInputs"))}</span>
        </div>
        ${policyNote}

        <div>
          <span class="metric-label">${escapeHtml(t("netProfit"))}</span>
          <div class="profit ${profitClass}">${escapeHtml(money(result.netProfit))}</div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <span class="metric-label">${escapeHtml(t("margin"))}</span>
            <strong>${escapeHtml(percent(result.profitMargin))}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">${escapeHtml(t("roi"))}</span>
            <strong>${escapeHtml(percent(result.roi))}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">${escapeHtml(t("breakEven"))}</span>
            <strong>${escapeHtml(money(result.breakEvenPrice))}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">${escapeHtml(t("maxCacAds"))}</span>
            <strong>${escapeHtml(money(result.maxAllowableMarketingCost))}</strong>
          </div>
        </div>

        <div class="breakdown">
          ${renderCostBreakdown(result)}
        </div>
      </article>
    `;
  }

  function renderSources() {
    const markets = Object.entries(rates.markets);
    sourceList.innerHTML = markets
      .map(([id, market]) => {
        const label = t(MARKET_LABEL_KEYS[id] || market.label);
        const links = market.sources
          .map((source) => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a>`)
          .join(", ");
        return `<li>${escapeHtml(label)}: ${escapeHtml(market.lastVerifiedAt)} - ${links}</li>`;
      })
      .join("");
  }

  function snapshotToShareParams(snapshot) {
    const params = new URLSearchParams();
    params.set("v", "1");

    Object.entries(SHARE_KEYS).forEach(([id, key]) => {
      if (snapshot.fulfillmentMode !== "dropshipping" && ["supplierProcessingFee", "reshipLoss"].includes(id)) {
        return;
      }

      const next = snapshot[id];
      const fallback = defaults[id];

      if (String(next) !== String(fallback)) {
        params.set(key, String(next));
      }
    });

    return params;
  }

  function getShareUrl() {
    const params = snapshotToShareParams(getFormSnapshot());
    const query = params.toString();
    return `${window.location.origin}${window.location.pathname}${query === "v=1" ? "" : `?${query}`}`;
  }

  function updateQuery() {
    const nextUrl = getShareUrl();

    if (window.location.href !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportSnapshotEntries(snapshot) {
    return Object.entries(snapshot).filter(([id]) =>
      snapshot.fulfillmentMode === "dropshipping" ||
      !["supplierProcessingFee", "reshipLoss"].includes(id)
    );
  }

  function snapshotLabel(id, snapshot) {
    const modeLabels = MODE_INPUT_LABEL_KEYS[snapshot.fulfillmentMode];

    if (modeLabels && modeLabels[id]) {
      return t(modeLabels[id]);
    }

    return t(INPUT_LABEL_KEYS[id] || id);
  }

  function snapshotValue(id, nextValue) {
    if (id === "tiktokProcessingEnabled") {
      return Boolean(nextValue) ? t("yes") : t("no");
    }

    const valueLabels = VALUE_LABEL_KEYS[id];
    const stringValue = String(nextValue);

    if (valueLabels && valueLabels[stringValue]) {
      return t(valueLabels[stringValue]);
    }

    return stringValue;
  }

  function resultRows(results) {
    return results.map((item) => [
      item.label,
      money(item.netProfit),
      percent(item.profitMargin),
      percent(item.roi),
      money(item.breakEvenPrice),
      money(item.maxAllowableMarketingCost)
    ]);
  }

  function downloadCsv() {
    const { results, best } = calc.calculateAll(getState(), rates);
    const snapshot = getFormSnapshot();
    const rows = [
      [t("exportTitle"), new Date().toISOString()],
      [t("shareUrl"), getShareUrl()],
      [],
      [t("bestPlatform"), best.label],
      [t("bestNetProfit"), money(best.netProfit)],
      [t("bestMargin"), percent(best.profitMargin)],
      [],
      [t("platform"), t("netProfit"), t("margin"), t("roi"), t("breakEven"), t("maxCacAds")],
      ...resultRows(results),
      [],
      [t("input"), t("value")],
      ...exportSnapshotEntries(snapshot).map(([id, nextValue]) => [
        snapshotLabel(id, snapshot),
        snapshotValue(id, nextValue)
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = URL.createObjectURL(blob);
    link.download = `skuroi-${currentLocale}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    updateSaveStatus(t("csvExported"));
  }

  function reportTable(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function openPdfReport() {
    const popup = window.open("", "_blank", "width=980,height=720");

    if (!popup) {
      updateSaveStatus(t("pdfPopupBlocked"));
      return;
    }

    popup.opener = null;

    const { results, best } = calc.calculateAll(getState(), rates);
    const snapshot = getFormSnapshot();
    const shareUrl = getShareUrl();
    const inputRows = exportSnapshotEntries(snapshot).map(([id, nextValue]) => [
      snapshotLabel(id, snapshot),
      snapshotValue(id, nextValue)
    ]);
    const documentHtml = `<!doctype html>
<html lang="${escapeHtml(currentLocaleInfo.lang)}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(t("pdfTitle"))}</title>
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
    }
    main { padding: 28px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; }
    h2 { margin: 28px 0 10px; font-size: 16px; }
    p { margin: 6px 0; }
    a { color: #087f8c; overflow-wrap: anywhere; }
    .kicker { color: #087f8c; font-weight: 800; text-transform: uppercase; }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .metric {
      border: 1px solid #ccd8dc;
      border-radius: 8px;
      padding: 12px;
      background: #f7fafb;
    }
    .metric span {
      display: block;
      color: #66757d;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      border: 1px solid #d6e0e3;
      padding: 8px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th { background: #edf4f5; color: #334149; font-size: 12px; text-transform: uppercase; }
    .hint { margin-top: 24px; color: #66757d; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <p class="kicker">${escapeHtml(t("brandDomain"))}</p>
    <h1>${escapeHtml(t("pdfTitle"))}</h1>
    <p>${escapeHtml(t("generatedAt"))}: ${escapeHtml(dateTime(new Date()))}</p>
    <p>${escapeHtml(t("shareUrl"))}: <a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a></p>

    <section class="summary">
      <div class="metric">
        <span>${escapeHtml(t("bestPlatform"))}</span>
        <strong>${escapeHtml(best.label)}</strong>
      </div>
      <div class="metric">
        <span>${escapeHtml(t("bestNetProfit"))}</span>
        <strong>${escapeHtml(money(best.netProfit))}</strong>
      </div>
      <div class="metric">
        <span>${escapeHtml(t("bestMargin"))}</span>
        <strong>${escapeHtml(percent(best.profitMargin))}</strong>
      </div>
    </section>

    <h2>${escapeHtml(t("results"))}</h2>
    ${reportTable(
      [t("platform"), t("netProfit"), t("margin"), t("roi"), t("breakEven"), t("maxCacAds")],
      resultRows(results)
    )}

    <h2>${escapeHtml(t("configuredInputs"))}</h2>
    ${reportTable([t("input"), t("value")], inputRows)}

    <p class="hint">${escapeHtml(t("pdfPrintHint"))}</p>
  </main>
</body>
</html>`;

    popup.document.open();
    popup.document.write(documentHtml);
    popup.document.close();
    updateSaveStatus(t("pdfOpened"));

    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 300);
  }

  function closeExportMenu() {
    exportMenu.hidden = true;
    exportButton.setAttribute("aria-expanded", "false");
  }

  function toggleExportMenu() {
    const nextOpen = exportMenu.hidden;
    exportMenu.hidden = !nextOpen;
    exportButton.setAttribute("aria-expanded", String(nextOpen));
  }

  function copyShareUrl(url) {
    if (!navigator.clipboard) {
      window.prompt(t("copySharePrompt"), url);
      updateSaveStatus(t("shareReady"));
      return;
    }

    navigator.clipboard.writeText(url).then(() => {
      updateSaveStatus(t("shareCopied"));
    }).catch(() => {
      window.prompt(t("copySharePrompt"), url);
      updateSaveStatus(t("shareReady"));
    });
  }

  function shareConfig() {
    const url = getShareUrl();
    const sharePayload = {
      title: t("metaTitle"),
      text: t("shareText"),
      url
    };

    if (navigator.share) {
      navigator.share(sharePayload).then(() => {
        updateSaveStatus(t("shareOpened"));
      }).catch(() => {
        copyShareUrl(url);
      });
      return;
    }

    copyShareUrl(url);
  }

  function render(options = {}) {
    const state = getState();
    const { results, best } = calc.calculateAll(state, rates);

    bestPlatform.textContent = best.label;
    bestProfit.textContent = money(best.netProfit);
    bestMargin.textContent = percent(best.profitMargin);
    resultHost.innerHTML = results.map(renderCard).join("");
    updateQuery();

    if (options.persist !== false) {
      saveFormSnapshot();
    }
  }

  function hydrateFromQuery() {
    const params = new URLSearchParams(window.location.search);

    Object.entries(SHARE_IDS).forEach(([key, id]) => {
      if (!params.has(key)) {
        return;
      }

      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      if (element.type === "checkbox") {
        element.checked = params.get(key) === "true" || params.get(key) === "1";
      } else {
        element.value = params.get(key);
      }
    });
  }

  function legacyHydrateFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const map = {
      price: "sellingPrice",
      cost: "productCost",
      ship: "inboundShipping",
      sellerShip: "sellerShipping",
      shopifyCac: "shopifyCac",
      tiktokAds: "tiktokAdsCost",
      amazonPpc: "amazonPpcCost"
    };

    Object.entries(map).forEach(([key, id]) => {
      if (params.has(key)) {
        document.getElementById(id).value = params.get(key);
      }
    });
  }

  applyStaticTranslations();
  setupLanguageSelect();
  form.addEventListener("input", render);
  form.addEventListener("change", (event) => {
    if (event.target && event.target.id === "fulfillmentMode") {
      const nextMode = currentFulfillmentMode();
      applyFulfillmentModeDefaults(nextMode, activeFulfillmentMode);
      activeFulfillmentMode = nextMode;
      applyFulfillmentModeUi();
    }

    render();
  });
  resetButton.addEventListener("click", setDefaults);
  clearSavedButton.addEventListener("click", clearSavedData);
  shareButton.addEventListener("click", shareConfig);
  exportButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleExportMenu();
  });
  exportMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  exportPdfButton.addEventListener("click", () => {
    closeExportMenu();
    openPdfReport();
  });
  exportCsvButton.addEventListener("click", () => {
    closeExportMenu();
    downloadCsv();
  });
  document.addEventListener("click", closeExportMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeExportMenu();
    }
  });

  hydrateFromStorage();
  legacyHydrateFromQuery();
  hydrateFromQuery();
  activeFulfillmentMode = currentFulfillmentMode();
  applyFulfillmentModeUi();
  renderSources();
  render();
})();
