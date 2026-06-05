(function startApp() {
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
  const copyButton = document.getElementById("copySummary");
  const saveStatus = document.getElementById("saveStatus");
  const STORAGE_KEY = "skuroi.calculator.inputs.v1";

  const defaults = {
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
    amazonCategory: "electronics",
    amazonReferralRate: 15,
    amazonFbaFee: 4.15,
    amazonStorageFee: 0.2,
    amazonPpcCost: 5,
    amazonOtherCosts: 0
  };

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: rates.currency,
      maximumFractionDigits: 2
    }).format(Number.isFinite(value) ? value : 0);
  }

  function percent(value) {
    return `${calc.format.pct(value)}%`;
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

  function getState() {
    return {
      sellingPrice: number("sellingPrice"),
      productCost: number("productCost"),
      inboundShipping: number("inboundShipping"),
      customerShipping: number("customerShipping"),
      sellerShipping: number("sellerShipping"),
      returnRate: number("returnRate") / 100,
      returnLoss: number("returnLoss"),
      otherCosts: number("otherCosts"),
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

    saveStatus.textContent = message;
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
      updateSaveStatus("Saved locally");
    } catch (error) {
      updateSaveStatus("Local save unavailable");
    }
  }

  function hydrateFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        updateSaveStatus("Ready to save");
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && parsed.values && typeof parsed.values === "object") {
        setFormValues(parsed.values);
        updateSaveStatus("Restored locally");
      }
    } catch (error) {
      updateSaveStatus("Saved data ignored");
    }
  }

  function clearSavedData() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore localStorage errors; the UI still resets to defaults below.
    }

    setFormValues(defaults);
    render({ persist: false });
    updateSaveStatus("Saved data cleared");
  }

  function renderCostBreakdown(result) {
    const max = Math.max(...result.costs.map((item) => item.amount), 1);

    return result.costs
      .map((item) => {
        const width = Math.max(4, Math.round((item.amount / max) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">
              <span>${item.label}</span>
              <strong>${money(item.amount)}</strong>
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

    return `
      <article class="platform-card" data-platform="${result.id}">
        <div class="platform-header">
          <div>
            <h3>${result.label}</h3>
            <p class="note">Last verified ${result.metadata.lastVerifiedAt}</p>
          </div>
          <span class="tag">${result.id === "amazon" ? "Lite" : "Live inputs"}</span>
        </div>

        <div>
          <span class="metric-label">Net profit</span>
          <div class="profit ${profitClass}">${money(result.netProfit)}</div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <span class="metric-label">Margin</span>
            <strong>${percent(result.profitMargin)}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">ROI</span>
            <strong>${percent(result.roi)}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Break-even</span>
            <strong>${money(result.breakEvenPrice)}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Max CAC / ads</span>
            <strong>${money(result.maxAllowableMarketingCost)}</strong>
          </div>
        </div>

        <div class="breakdown">
          ${renderCostBreakdown(result)}
        </div>
      </article>
    `;
  }

  function renderSources() {
    const markets = Object.values(rates.markets);
    sourceList.innerHTML = markets
      .map((market) => {
        const links = market.sources
          .map((source) => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label}</a>`)
          .join(", ");
        return `<li>${market.label}: ${market.lastVerifiedAt} - ${links}</li>`;
      })
      .join("");
  }

  function updateQuery(state) {
    const params = new URLSearchParams();
    [
      ["price", state.sellingPrice],
      ["cost", state.productCost],
      ["ship", state.inboundShipping],
      ["sellerShip", state.sellerShipping],
      ["shopifyCac", state.shopify.cac],
      ["tiktokAds", state.tiktok.adsCost],
      ["amazonPpc", state.amazon.ppcCost]
    ].forEach(([key, next]) => {
      params.set(key, String(next));
    });

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function render(options = {}) {
    const state = getState();
    const { results, best } = calc.calculateAll(state, rates);

    bestPlatform.textContent = best.label;
    bestProfit.textContent = money(best.netProfit);
    bestMargin.textContent = percent(best.profitMargin);
    resultHost.innerHTML = results.map(renderCard).join("");
    updateQuery(state);

    if (options.persist !== false) {
      saveFormSnapshot();
    }
  }

  function copySummary() {
    const { results, best } = calc.calculateAll(getState(), rates);
    const lines = [
      `Best platform: ${best.label}`,
      `Best net profit: ${money(best.netProfit)}`,
      `Best margin: ${percent(best.profitMargin)}`,
      "",
      ...results.map(
        (item) =>
          `${item.label}: profit ${money(item.netProfit)}, margin ${percent(item.profitMargin)}, ROI ${percent(item.roi)}`
      )
    ];

    if (!navigator.clipboard) {
      window.prompt("Copy summary", lines.join("\n"));
      return;
    }

    navigator.clipboard.writeText(lines.join("\n")).catch(() => {
      window.prompt("Copy summary", lines.join("\n"));
    });
  }

  function hydrateFromQuery() {
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

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  resetButton.addEventListener("click", setDefaults);
  clearSavedButton.addEventListener("click", clearSavedData);
  copyButton.addEventListener("click", copySummary);

  hydrateFromStorage();
  hydrateFromQuery();
  renderSources();
  render();
})();
