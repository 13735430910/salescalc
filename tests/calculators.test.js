const assert = require("node:assert/strict");
const test = require("node:test");
const rates = require("../src/rates.js");
const calc = require("../src/calculators.js");

function baseInput(overrides = {}) {
  return {
    fulfillmentMode: "stocked",
    sellingPrice: 39.99,
    productCost: 12,
    inboundShipping: 3.5,
    customerShipping: 0,
    sellerShipping: 4,
    returnRate: 0.05,
    returnLoss: 8,
    otherCosts: 0,
    supplierProcessingFee: 0,
    reshipLoss: 0,
    shopify: {
      plan: "basic",
      paymentMethod: "standardCard",
      cac: 8,
      appCost: 0
    },
    tiktok: {
      referralRate: 0.06,
      affiliateRate: 0.1,
      adsCost: 6,
      processingRate: 0,
      processingFixed: 0,
      processingEnabled: false
    },
    amazon: {
      category: "electronics",
      referralRate: 0.15,
      fbaFee: 4.15,
      storageFee: 0.2,
      ppcCost: 5,
      otherCosts: 0
    },
    ...overrides
  };
}

test("calculates all three platforms without invalid numbers", () => {
  const { results, best } = calc.calculateAll(baseInput(), rates);

  assert.equal(results.length, 3);
  assert.ok(best);

  for (const result of results) {
    assert.equal(Number.isFinite(result.netProfit), true);
    assert.equal(Number.isFinite(result.profitMargin), true);
    assert.equal(Number.isFinite(result.roi), true);
    assert.equal(Number.isFinite(result.breakEvenPrice), true);
  }
});

test("dropshipping supplier costs reduce profit", () => {
  const base = calc.calculateShopify(
    baseInput({
      fulfillmentMode: "dropshipping",
      inboundShipping: 0,
      supplierProcessingFee: 0,
      reshipLoss: 0
    }),
    rates
  );
  const withSupplierCosts = calc.calculateShopify(
    baseInput({
      fulfillmentMode: "dropshipping",
      inboundShipping: 0,
      supplierProcessingFee: 1.25,
      reshipLoss: 2.5
    }),
    rates
  );

  assert.equal(base.netProfit - withSupplierCosts.netProfit, 3.75);
});

test("dropshipping uses supplier fulfillment cost in ROI denominator", () => {
  const stocked = calc.calculateShopify(baseInput(), rates);
  const dropshipping = calc.calculateShopify(
    baseInput({
      fulfillmentMode: "dropshipping",
      inboundShipping: 0,
      sellerShipping: 9,
      supplierProcessingFee: 1
    }),
    rates
  );

  assert.equal(Number.isFinite(dropshipping.roi), true);
  assert.notEqual(dropshipping.roi, stocked.roi);
});

test("Shopify payment fee changes by plan and payment method", () => {
  const basic = calc.calculateShopify(baseInput(), rates);
  const advanced = calc.calculateShopify(
    baseInput({
      shopify: {
        plan: "advanced",
        paymentMethod: "standardCard",
        cac: 8,
        appCost: 0
      }
    }),
    rates
  );

  assert.ok(advanced.netProfit > basic.netProfit);
});

test("TikTok processing toggle affects profit", () => {
  const disabled = calc.calculateTikTok(baseInput(), rates);
  const enabled = calc.calculateTikTok(
    baseInput({
      tiktok: {
        referralRate: 0.06,
        affiliateRate: 0.1,
        adsCost: 6,
        processingRate: 0.022,
        processingFixed: 0.3,
        processingEnabled: true
      }
    }),
    rates
  );

  assert.ok(disabled.netProfit > enabled.netProfit);
});

test("Amazon manual referral rate overrides category table", () => {
  const category = calc.calculateAmazon(baseInput(), rates);
  const manual = calc.calculateAmazon(
    baseInput({
      amazon: {
        category: "manual",
        referralRate: 0.2,
        fbaFee: 4.15,
        storageFee: 0.2,
        ppcCost: 5,
        otherCosts: 0
      }
    }),
    rates
  );

  assert.ok(category.netProfit > manual.netProfit);
});

test("zero selling price remains stable", () => {
  const { results } = calc.calculateAll(baseInput({ sellingPrice: 0 }), rates);

  for (const result of results) {
    assert.equal(Number.isFinite(result.netProfit), true);
    assert.equal(result.profitMargin, 0);
  }
});
