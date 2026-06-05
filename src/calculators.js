(function attachCalculator(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.SalesCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCalculator() {
  const MAX_BREAK_EVEN_PRICE = 10000;

  function toNumber(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(toNumber(value), min), max);
  }

  function money(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
  }

  function pct(value) {
    return Math.round(toNumber(value) * 10000) / 100;
  }

  function divide(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  function common(input) {
    const sellingPrice = Math.max(0, toNumber(input.sellingPrice));
    const customerShipping = Math.max(0, toNumber(input.customerShipping));
    const productCost = Math.max(0, toNumber(input.productCost));
    const inboundShipping = Math.max(0, toNumber(input.inboundShipping));
    const sellerShipping = Math.max(0, toNumber(input.sellerShipping));
    const returnRate = clamp(input.returnRate, 0, 1);
    const returnLoss = Math.max(0, toNumber(input.returnLoss));
    const otherCosts = Math.max(0, toNumber(input.otherCosts));
    const grossRevenue = sellingPrice + customerShipping;
    const expectedReturnLoss = returnRate * returnLoss;
    const baseInventoryCost = productCost + inboundShipping;

    return {
      sellingPrice,
      customerShipping,
      productCost,
      inboundShipping,
      sellerShipping,
      returnRate,
      returnLoss,
      otherCosts,
      grossRevenue,
      expectedReturnLoss,
      baseInventoryCost
    };
  }

  function summarize(id, label, revenue, costs, marketingCost, inventoryCost, metadata) {
    const totalCost = costs.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = revenue - totalCost;
    const profitMargin = divide(netProfit, revenue);
    const roi = divide(netProfit, inventoryCost + marketingCost);
    const maxAllowableMarketingCost = Math.max(0, marketingCost + netProfit);

    return {
      id,
      label,
      metadata,
      grossRevenue: money(revenue),
      totalCost: money(totalCost),
      netProfit: money(netProfit),
      profitMargin,
      roi,
      maxAllowableMarketingCost: money(maxAllowableMarketingCost),
      costs: costs
        .filter((item) => item.amount > 0)
        .map((item) => ({ ...item, amount: money(item.amount) }))
    };
  }

  function findBreakEven(input, calculator, rates) {
    let low = 0;
    let high = Math.max(MAX_BREAK_EVEN_PRICE, toNumber(input.sellingPrice) * 10);

    for (let i = 0; i < 48; i += 1) {
      const mid = (low + high) / 2;
      const next = calculator({ ...input, sellingPrice: mid }, rates, false);

      if (next.netProfit >= 0) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return money(high);
  }

  function calculateShopify(input, rates, includeBreakEven = true) {
    const data = common(input);
    const market = rates.markets.shopify_us;
    const planKey = input.shopify.plan in market.plans ? input.shopify.plan : "basic";
    const plan = market.plans[planKey];
    const paymentKey =
      input.shopify.paymentMethod in plan.payments ? input.shopify.paymentMethod : "standardCard";
    const payment = plan.payments[paymentKey];
    const paymentFee = data.grossRevenue * payment.rate + payment.fixed;
    const cac = Math.max(0, toNumber(input.shopify.cac));
    const appCost = Math.max(0, toNumber(input.shopify.appCost));

    const result = summarize(
      "shopify",
      "Shopify",
      data.grossRevenue,
      [
        { label: "Product cost", amount: data.productCost, color: "#64748b" },
        { label: "Inbound shipping", amount: data.inboundShipping, color: "#0f766e" },
        { label: "Seller shipping", amount: data.sellerShipping, color: "#0284c7" },
        { label: "Payment fee", amount: paymentFee, color: "#7c3aed" },
        { label: "CAC / ads", amount: cac, color: "#dc2626" },
        { label: "App cost", amount: appCost, color: "#a16207" },
        { label: "Return loss", amount: data.expectedReturnLoss, color: "#be123c" },
        { label: "Other cost", amount: data.otherCosts, color: "#475569" }
      ],
      cac,
      data.baseInventoryCost,
      {
        plan: plan.label,
        payment: payment.label,
        lastVerifiedAt: market.lastVerifiedAt
      }
    );

    if (includeBreakEven) {
      result.breakEvenPrice = findBreakEven(input, calculateShopify, rates);
    }

    return result;
  }

  function calculateTikTok(input, rates, includeBreakEven = true) {
    const data = common(input);
    const market = rates.markets.tiktok_shop_us;
    const referralRate = clamp(input.tiktok.referralRate, 0, 1);
    const affiliateRate = clamp(input.tiktok.affiliateRate, 0, 0.8);
    const processingEnabled = Boolean(input.tiktok.processingEnabled);
    const processingRate = processingEnabled ? clamp(input.tiktok.processingRate, 0, 1) : 0;
    const processingFixed = processingEnabled ? Math.max(0, toNumber(input.tiktok.processingFixed)) : 0;
    const adsCost = Math.max(0, toNumber(input.tiktok.adsCost));
    const referralFee = data.grossRevenue * referralRate;
    const processingFee = data.grossRevenue * processingRate + processingFixed;
    const affiliateFee = data.sellingPrice * affiliateRate;

    const result = summarize(
      "tiktok",
      "TikTok Shop",
      data.grossRevenue,
      [
        { label: "Product cost", amount: data.productCost, color: "#64748b" },
        { label: "Inbound shipping", amount: data.inboundShipping, color: "#0f766e" },
        { label: "Seller shipping", amount: data.sellerShipping, color: "#0284c7" },
        { label: "Referral fee", amount: referralFee, color: "#111827" },
        { label: "Processing fee", amount: processingFee, color: "#7c3aed" },
        { label: "Affiliate commission", amount: affiliateFee, color: "#db2777" },
        { label: "Ads / GMV Max", amount: adsCost, color: "#dc2626" },
        { label: "Return loss", amount: data.expectedReturnLoss, color: "#be123c" },
        { label: "Other cost", amount: data.otherCosts, color: "#475569" }
      ],
      adsCost,
      data.baseInventoryCost,
      {
        referralRate,
        affiliateRate,
        processingEnabled,
        lastVerifiedAt: market.lastVerifiedAt
      }
    );

    if (includeBreakEven) {
      result.breakEvenPrice = findBreakEven(input, calculateTikTok, rates);
    }

    return result;
  }

  function calculateAmazon(input, rates, includeBreakEven = true) {
    const data = common(input);
    const market = rates.markets.amazon_fba_us_lite;
    const category = input.amazon.category;
    const referralRate =
      category === "manual" || !market.referralFees[category]
        ? clamp(input.amazon.referralRate, 0, 1)
        : market.referralFees[category].rate;
    const fbaFee = Math.max(0, toNumber(input.amazon.fbaFee));
    const storageFee = Math.max(0, toNumber(input.amazon.storageFee));
    const ppcCost = Math.max(0, toNumber(input.amazon.ppcCost));
    const amazonOtherCosts = Math.max(0, toNumber(input.amazon.otherCosts));
    const referralFee = data.grossRevenue * referralRate;

    const result = summarize(
      "amazon",
      "Amazon FBA Lite",
      data.grossRevenue,
      [
        { label: "Product cost", amount: data.productCost, color: "#64748b" },
        { label: "Inbound shipping", amount: data.inboundShipping, color: "#0f766e" },
        { label: "Referral fee", amount: referralFee, color: "#b45309" },
        { label: "FBA fulfillment", amount: fbaFee, color: "#92400e" },
        { label: "Storage", amount: storageFee, color: "#a16207" },
        { label: "PPC ads", amount: ppcCost, color: "#dc2626" },
        { label: "Return loss", amount: data.expectedReturnLoss, color: "#be123c" },
        { label: "Other Amazon cost", amount: amazonOtherCosts + data.otherCosts, color: "#475569" }
      ],
      ppcCost,
      data.baseInventoryCost,
      {
        category,
        referralRate,
        lastVerifiedAt: market.lastVerifiedAt
      }
    );

    if (includeBreakEven) {
      result.breakEvenPrice = findBreakEven(input, calculateAmazon, rates);
    }

    return result;
  }

  function calculateAll(input, rates) {
    const results = [
      calculateShopify(input, rates),
      calculateTikTok(input, rates),
      calculateAmazon(input, rates)
    ];
    const best = results.reduce((winner, item) =>
      item.netProfit > winner.netProfit ? item : winner
    );

    return { results, best };
  }

  return {
    calculateAll,
    calculateShopify,
    calculateTikTok,
    calculateAmazon,
    format: { money, pct }
  };
});
