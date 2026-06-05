(function attachRates(root, factory) {
  const rates = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = rates;
  }

  root.SALES_CALC_RATES = rates;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRates() {
  return {
    version: "2026-06-05",
    currency: "USD",
    markets: {
      shopify_us: {
        label: "Shopify US",
        lastVerifiedAt: "2026-06-05",
        sources: [
          {
            label: "Shopify pricing",
            url: "https://www.shopify.com/pricing"
          },
          {
            label: "Shopify Payments card rates",
            url: "https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates"
          }
        ],
        plans: {
          basic: {
            label: "Basic",
            payments: {
              standardCard: { label: "Standard card", rate: 0.029, fixed: 0.3 },
              premiumCard: { label: "Premium card", rate: 0.035, fixed: 0.3 },
              internationalCard: { label: "International card", rate: 0.039, fixed: 0.3 },
              thirdParty: { label: "Third-party gateway", rate: 0.02, fixed: 0 }
            }
          },
          grow: {
            label: "Grow",
            payments: {
              standardCard: { label: "Standard card", rate: 0.027, fixed: 0.3 },
              premiumCard: { label: "Premium card", rate: 0.033, fixed: 0.3 },
              internationalCard: { label: "International card", rate: 0.037, fixed: 0.3 },
              thirdParty: { label: "Third-party gateway", rate: 0.01, fixed: 0 }
            }
          },
          advanced: {
            label: "Advanced",
            payments: {
              standardCard: { label: "Standard card", rate: 0.025, fixed: 0.3 },
              premiumCard: { label: "Premium card", rate: 0.031, fixed: 0.3 },
              internationalCard: { label: "International card", rate: 0.035, fixed: 0.3 },
              thirdParty: { label: "Third-party gateway", rate: 0.006, fixed: 0 }
            }
          }
        },
        notes: [
          "Rates vary by country, card type, payment method, and plan.",
          "Verify exact rates in the Shopify admin before making pricing decisions."
        ]
      },
      tiktok_shop_us: {
        label: "TikTok Shop US",
        lastVerifiedAt: "2026-06-05",
        sources: [
          {
            label: "TikTok Shop referral fee updates",
            url: "https://seller-us.tiktok.com/university/essay?knowledge_id=5982454398175018"
          }
        ],
        defaults: {
          referralFeeRate: 0.06,
          processingFeeRate: 0,
          processingFixedFee: 0,
          affiliateCommissionRate: 0.1
        },
        notes: [
          "Processing fee treatment can vary. Keep it editable and verify in Seller Center.",
          "Affiliate commission is seller-defined and can materially change profit."
        ]
      },
      amazon_fba_us_lite: {
        label: "Amazon FBA US Lite",
        lastVerifiedAt: "2026-06-05",
        sources: [
          {
            label: "Amazon standard selling fees",
            url: "https://sell.amazon.com/pricing"
          }
        ],
        referralFees: {
          electronics: { label: "Electronics", rate: 0.08 },
          home_kitchen: { label: "Home & Kitchen", rate: 0.15 },
          apparel_default: { label: "Apparel", rate: 0.15 }
        },
        notes: [
          "Lite mode does not calculate ASIN-level FBA fees.",
          "Amazon apparel and some categories use tiered referral fees; use manual override for exact estimates.",
          "Enter fulfillment fees from Amazon Revenue Calculator or Seller Central for final estimates."
        ]
      }
    }
  };
});
