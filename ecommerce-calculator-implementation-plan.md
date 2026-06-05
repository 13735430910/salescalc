# 跨境电商多平台利润计算器落地方案

日期：2026-06-05

## 1. 结论

本项目可以启动，但不应按“多平台全覆盖 + 批量 AI SEO + 快速广告变现”的原方案推进。原方案最大的问题是过度低估了费率准确性、用户信任、SEO 冷启动和持续维护成本。

修正后的方向是：先做一个高可信、可校验、可手动修正费率的免费计算器。首版聚焦美国市场的 Shopify、TikTok Shop，并以简化 Amazon FBA 作为对比项。项目成败不取决于前端复杂度，而取决于公式透明、来源可追溯、结果可解释、用户愿意收藏和分享。

建议执行：低成本试水 30 天。达到验证指标后再扩展 Amazon 细分费率、西语版本、批量 SKU 和高级报告。

## 2. 修改后的产品定位

### 2.1 一句话定位

一个面向中小跨境卖家的免费多平台利润对比计算器：输入一次售价、成本、运费和广告成本，即可比较 Shopify、TikTok Shop、Amazon FBA 的净利润、利润率、ROI 和盈亏平衡点。

### 2.2 首版目标用户

- 美国市场 Shopify 独立站卖家
- TikTok Shop US 卖家和准备入场的新手
- 正在比较“独立站 vs TikTok Shop vs Amazon FBA”的选品人员
- 小团队跨境卖家、运营、财务助理

### 2.3 暂不服务的用户

- 需要精确同步后台订单、库存、Payout 的成熟卖家
- 需要 ASIN 级别实时 FBA 数据的 Amazon 专业卖家
- 需要覆盖多个税区、VAT、墨西哥 RFC、欧盟 OSS 的复杂税务场景
- 需要替代 ERP、Sellerboard、Helium 10 的重度用户

## 3. 首版 MVP 范围

### 3.1 平台范围

首版只做 3 个对比卡片：

- Shopify US
- TikTok Shop US
- Amazon FBA US Lite

Amazon FBA 首版只提供基础 referral fee 和手动 FBA fulfillment fee 输入，不承诺 ASIN 级精确计算。这样可以保留跨平台对比卖点，同时避免因为 FBA 复杂费率导致可信度崩塌。

### 3.2 核心输入项

通用输入：

- Selling price：售价
- Product cost：产品采购成本
- Inbound shipping / landed cost：头程或到岸物流成本
- Customer shipping charged：客户支付运费，可选
- Seller shipping cost：卖家实际承担运费
- Return rate：预估退货率
- Return loss per returned order：每笔退货损耗
- Tax included toggle：是否将税费纳入收入基数

Shopify 输入：

- Plan：Basic / Grow / Advanced / Plus
- Payment method：Shopify Payments standard card / premium card / international card / PayPal / third-party gateway
- CAC / ad cost per order：每单获客成本
- App cost per order：插件或订阅摊销，可选

TikTok Shop 输入：

- Referral fee rate：默认值 + 可手动覆盖
- Processing fee：默认值 + 是否单独计入 toggle
- Affiliate commission rate：达人佣金
- TikTok ads / GMV Max cost per order：广告成本
- FBT / seller shipping cost：履约成本
- Platform discount handling：平台券是否计入佣金基数的提示，不在 MVP 自动处理复杂规则

Amazon FBA Lite 输入：

- Category referral fee：类目佣金
- FBA fulfillment fee：手动输入
- Storage fee per unit：可选
- PPC cost per order：广告成本
- Inbound placement / prep / labeling fee：其他 Amazon 成本，可选

### 3.3 核心输出项

每个平台输出：

- Gross revenue
- Platform fees
- Payment fees
- Fulfillment / shipping cost
- Marketing cost
- Return loss
- Net profit
- Profit margin
- ROI
- Break-even price
- Max allowable CAC

右侧或下方展示：

- 三个平台并排对比
- 成本构成条形图，优先于饼图
- 最高利润平台提示
- 风险提示：结果仅为估算，实际费用以平台账单为准

## 4. 费率数据治理

这是项目的核心可信度来源，优先级高于 UI 动效和文章数量。

### 4.1 rates.json 结构

```json
{
  "version": "2026-06-05",
  "markets": {
    "shopify_us": {
      "label": "Shopify US",
      "lastVerifiedAt": "2026-06-05",
      "sources": [
        "https://www.shopify.com/pricing",
        "https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates"
      ],
      "plans": {
        "basic": {
          "monthly": 39,
          "yearlyMonthlyEquivalent": 29,
          "standardCardRate": 0.029,
          "standardFixedFee": 0.3,
          "premiumCardRate": 0.035,
          "internationalSurcharge": 0.01,
          "thirdPartyTransactionFee": 0.02
        }
      },
      "notes": [
        "Actual rates can vary by country, card type, payment method, and plan.",
        "Users should verify exact rates in Shopify admin."
      ]
    },
    "tiktok_shop_us": {
      "label": "TikTok Shop US",
      "lastVerifiedAt": "2026-06-05",
      "sources": [
        "https://ads.tiktok.com/help/article/about-setting-different-affiliate-commission-rates-for-tiktok-shop-ads"
      ],
      "defaults": {
        "referralFeeRate": 0.06,
        "processingFeeRate": 0.0,
        "affiliateCommissionRate": 0.1
      },
      "notes": [
        "Some public sources disagree on whether processing is included in the US fee structure.",
        "Keep processing fee editable and ask users to verify in Seller Center."
      ]
    },
    "amazon_fba_us_lite": {
      "label": "Amazon FBA US Lite",
      "lastVerifiedAt": "2026-06-05",
      "sources": [
        "https://sellercentral.amazon.com/seller-forums/discussions/t/f3fa3211-820b-4e2e-a023-158a9cf55f99"
      ],
      "referralFees": {
        "electronics": 0.08,
        "home_kitchen": 0.15,
        "apparel_default": 0.15
      },
      "notes": [
        "MVP does not calculate exact ASIN-level FBA fees.",
        "Users should enter FBA fulfillment fees from Amazon Revenue Calculator or Seller Central."
      ]
    }
  }
}
```

### 4.2 数据原则

- 每个默认费率必须有来源 URL
- 每个费率必须有 lastVerifiedAt
- 用户必须能覆盖默认值
- 结果页必须显示“Last verified”
- 对有争议的费率不要写死，使用 toggle 或 manual input
- 费率更新走独立 JSON，不要散落在组件代码中

## 5. 计算模型

### 5.1 通用模型

```txt
gross_revenue = selling_price + customer_shipping_charged

base_cost =
  product_cost
  + inbound_shipping_cost
  + seller_shipping_cost
  + platform_fees
  + payment_fees
  + marketing_cost
  + fulfillment_cost
  + other_costs

expected_return_loss =
  return_rate * return_loss_per_returned_order

net_profit =
  gross_revenue - base_cost - expected_return_loss

profit_margin =
  net_profit / gross_revenue

roi =
  net_profit / (product_cost + inbound_shipping_cost + marketing_cost)
```

ROI 分母需要在 UI 中说明：默认按“产品成本 + 到岸物流 + 广告成本”计算，不把平台佣金放入投入本金。后续可以允许用户选择 ROI 分母口径。

### 5.2 Shopify

```txt
shopify_payment_fee =
  gross_revenue * card_rate + fixed_fee

third_party_gateway_fee =
  use_third_party_gateway ? gross_revenue * third_party_fee_rate : 0

shopify_profit =
  gross_revenue
  - product_cost
  - inbound_shipping_cost
  - seller_shipping_cost
  - shopify_payment_fee
  - third_party_gateway_fee
  - cac
  - app_cost_per_order
  - expected_return_loss
```

### 5.3 TikTok Shop

```txt
tiktok_fee_base =
  selling_price + platform_discount_adjustment

tiktok_referral_fee =
  tiktok_fee_base * referral_fee_rate

tiktok_processing_fee =
  processing_fee_enabled ? tiktok_fee_base * processing_fee_rate + processing_fixed_fee : 0

tiktok_affiliate_fee =
  selling_price * affiliate_commission_rate

tiktok_profit =
  gross_revenue
  - product_cost
  - inbound_shipping_cost
  - seller_shipping_cost
  - tiktok_referral_fee
  - tiktok_processing_fee
  - tiktok_affiliate_fee
  - tiktok_ads_cost
  - expected_return_loss
```

### 5.4 Amazon FBA Lite

```txt
amazon_referral_fee =
  selling_price * referral_fee_rate

amazon_profit =
  gross_revenue
  - product_cost
  - inbound_shipping_cost
  - amazon_referral_fee
  - fba_fulfillment_fee
  - storage_fee_per_unit
  - ppc_cost_per_order
  - other_amazon_costs
  - expected_return_loss
```

## 6. 前端架构

### 6.1 技术栈

推荐：

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Zod
- Vitest
- Playwright

理由：

- 静态生成适合 SEO
- TypeScript + Zod 可以减少计算输入错误
- Recharts 足够轻量，适合成本构成图
- Playwright 用于验证移动端布局和关键计算流程

### 6.2 目录结构

```txt
app/
  page.tsx
  calculators/
    ecommerce-profit/
      page.tsx
  blog/
    [slug]/
      page.tsx
components/
  calculator/
    CalculatorShell.tsx
    InputPanel.tsx
    PlatformCard.tsx
    CostBreakdownChart.tsx
    AssumptionPanel.tsx
lib/
  calculators/
    shopify.ts
    tiktok.ts
    amazon-lite.ts
    shared.ts
  rates/
    rates.json
    schema.ts
  seo/
    metadata.ts
content/
  posts/
tests/
  calculator.test.ts
  rates-schema.test.ts
```

### 6.3 测试要求

必须测试：

- 负数输入处理
- 0 售价处理
- 小数精度和货币格式
- Shopify 不同套餐支付费率
- TikTok processing fee toggle
- Amazon 手动 FBA fee
- ROI 分母为 0 时的显示
- 移动端 390px 宽度布局不重叠

## 7. UI/UX 方案

### 7.1 页面结构

桌面端：

- 左侧输入面板，固定宽度
- 右侧三平台对比结果
- 下方公式说明、费率来源、FAQ

移动端：

- 顶部关键输入
- 平台结果卡片纵向排列
- 高级输入折叠
- 费率来源折叠

### 7.2 关键交互

- 输入即计算
- 所有默认费率旁显示来源和更新时间
- 每个平台有 Reset to default
- 每个平台有 Copy result
- 结果可通过 URL query 保存，例如：

```txt
/calculators/ecommerce-profit?price=39.99&cost=9&ship=4&cac=8
```

### 7.3 文案原则

不要写“100% accurate”。使用：

- Estimate
- Based on current default assumptions
- Verify with your platform account
- Last verified on YYYY-MM-DD

## 8. SEO 方案

### 8.1 原方案修正

不做批量 AI 文章矩阵。先做少量高质量页面，每页都要有真实计算器、公式、样例、来源和更新时间。

Google 对 AI 内容的态度不是“禁止 AI”，而是反对为了操纵排名而批量生成低价值页面。因此 AI 只能用于草稿、结构化和翻译，不能直接发布未校验内容。

### 8.2 首批页面

建议只做 6 个页面：

- `/calculators/ecommerce-profit`
- `/calculators/tiktok-shop-profit-calculator`
- `/calculators/shopify-profit-margin-calculator`
- `/calculators/amazon-fba-profit-calculator-lite`
- `/blog/tiktok-shop-fees-us-profit-example`
- `/blog/shopify-vs-tiktok-shop-profit-comparison`

### 8.3 每页必须包含

- 嵌入计算器
- 公式
- 示例订单
- 默认费率来源
- Last updated
- FAQ
- 免责声明

### 8.4 结构化数据

使用：

- WebApplication
- FAQPage
- BreadcrumbList

不要滥用 Review schema，除非有真实用户评价。

## 9. 冷启动方案

### 9.1 第 1 批分发渠道

- Reddit：r/shopify、r/tiktokshop、r/FulfillmentByAmazon、r/ecommerce
- Quora：利润率、TikTok Shop fees、Shopify margins 相关问题
- Indie Hackers / Product Hunt：等工具完整后再发
- Facebook 西语电商群：第二阶段再做

### 9.2 发帖原则

- 不硬广
- 用真实算例回答问题
- 链接只作为辅助工具
- 明确说明免费、无需登录、可手动改费率
- 收集用户质疑的费率点，优先修正

### 9.3 冷启动话术

```txt
I kept seeing sellers compare Shopify, TikTok Shop, and Amazon margins in spreadsheets, so I built a free calculator that shows the assumptions and lets you override every fee. It is not meant to replace Seller Center numbers, but it is useful for quick product screening.
```

## 10. 变现方案

### 10.1 阶段 1：不急着变现

上线前 30 天不放 AdSense，不做强 affiliate。目标是提高可信度和收集反馈。

### 10.2 阶段 2：轻量 affiliate

可放：

- Shopify
- Payoneer / Wise / PingPong
- Helium 10 / Jungle Scout
- 物流、海外仓、ERP

要求：

- 明确 affiliate disclosure
- 使用 `rel="sponsored noopener noreferrer"`
- 不把推荐链接伪装成官方链接
- 不在计算结果里强行推荐某个平台

### 10.3 阶段 3：高级功能

只有当免费版有稳定使用后再做：

- CSV 批量 SKU 计算
- PDF 报告导出
- 保存多个产品方案
- 多币种
- 西语本地化
- API

建议定价：

- 一次性买断 $19-$29
- 或 $4.99/月

不要太早做登录和订阅，会降低工具站冷启动转化。

## 11. 盈利预期估算

### 11.1 估算前提

本节不是收入承诺，只用于判断项目是否值得继续投入。跨境电商计算器的收入取决于 4 个变量：

- 有效流量：真正完成计算的用户，而不是页面 PV
- 商业意图：用户是否正在选品、定价、开店或采购工具
- 信任度：用户是否相信费率、公式和免责声明
- 变现克制：广告和 affiliate 是否不破坏工具可信度

首版前 30 天不应追求收入，目标是验证使用行为。盈利预期从第 2 个月开始估算。

### 11.2 收入来源拆分

可预期收入由 3 部分组成：

```txt
月收入 =
  广告收入
  + Affiliate 收入
  + 高级功能收入
```

广告收入：

```txt
广告收入 = 月 PV / 1000 * 页面 RPM
```

Affiliate 收入：

```txt
Affiliate 收入 =
  月有效计算用户
  * affiliate 点击率
  * affiliate 注册/购买转化率
  * 单次佣金
```

高级功能收入：

```txt
高级功能收入 =
  月有效计算用户
  * 付费转化率
  * 平均客单价
```

建议把“有效计算用户”定义为：完成至少一次计算，并停留 20 秒以上，或修改过至少一个平台费率的用户。

### 11.3 成本结构

首年硬性成本：

- 域名：约 $12-$20 / 年
- Cloudflare Pages / Vercel 静态托管：$0
- Google Search Console：$0
- Cloudflare Web Analytics：$0
- Plausible，可选：$9/月起
- 邮箱或联系表单，可选：$0-$5/月
- 设计资产、图标、UI 组件：$0

首版建议保持极低成本：

```txt
月固定现金成本 = $0-$10
首年现金成本 = $12-$120
```

主要成本不是现金，而是维护时间：

- 每月费率核对：2-4 小时
- 用户反馈处理：2-4 小时
- 内容更新：2-6 小时
- 社区分发：4-8 小时

### 11.4 三档收入预期

以下按上线后第 6 个月的稳定月度状态估算。

#### 保守档

适用情况：

- SEO 起量慢
- 社区分发带来少量真实用户
- 未接入或弱接入 affiliate
- 暂不做高级功能

假设：

- 月 PV：3,000
- 月有效计算用户：600
- 页面 RPM：$8
- Affiliate 点击率：1.5%
- Affiliate 转化率：3%
- 单次佣金：$25
- 高级功能收入：$0

估算：

```txt
广告收入 = 3,000 / 1000 * 8 = $24
Affiliate 收入 = 600 * 1.5% * 3% * 25 = $6.75
高级功能收入 = $0

月收入约 = $31
月净现金流约 = $20-$30
```

判断：

这个结果不能算失败。只要有效计算用户和搜索曝光持续上升，项目仍值得维护，但不应投入高级功能开发。

#### 基准档

适用情况：

- 3-6 个核心页面开始获得长尾搜索
- TikTok Shop / Shopify 对比页有稳定访问
- 工具有少量自然分享
- 轻量接入 2-3 个 affiliate

假设：

- 月 PV：15,000
- 月有效计算用户：3,000
- 页面 RPM：$15
- Affiliate 点击率：2.5%
- Affiliate 转化率：5%
- 单次佣金：$30
- 高级功能付费转化率：0.2%
- 高级功能客单价：$19

估算：

```txt
广告收入 = 15,000 / 1000 * 15 = $225
Affiliate 收入 = 3,000 * 2.5% * 5% * 30 = $112.50
高级功能收入 = 3,000 * 0.2% * 19 = $114

月收入约 = $451.50
月净现金流约 = $430-$450
```

判断：

这是合理的 6 个月目标。达到这个水平后，可以继续做批量 SKU、PDF 报告和西语版本。

#### 乐观档

适用情况：

- 多个页面进入长尾词前 5
- 计算器被社区、博客或工具导航站收录
- 用户开始主动覆盖费率并分享结果链接
- 高级功能开始有真实购买

假设：

- 月 PV：50,000
- 月有效计算用户：12,000
- 页面 RPM：$25
- Affiliate 点击率：4%
- Affiliate 转化率：6%
- 单次佣金：$40
- 高级功能付费转化率：0.5%
- 高级功能客单价：$29

估算：

```txt
广告收入 = 50,000 / 1000 * 25 = $1,250
Affiliate 收入 = 12,000 * 4% * 6% * 40 = $1,152
高级功能收入 = 12,000 * 0.5% * 29 = $1,740

月收入约 = $4,142
月净现金流约 = $4,000+
```

判断：

这是 12 个月以上才可能争取的结果，不应作为首版决策依据。能否达到取决于 SEO 排名、计算准确性和高级功能是否真正解决批量 SKU 痛点。

### 11.5 分阶段盈利路径

#### 第 0-30 天

目标：

- 验证需求
- 不追求收入
- 不放 AdSense
- 不做强 affiliate

预期收入：

```txt
$0-$20
```

健康信号：

- 有用户完成计算
- 有用户手动覆盖默认费率
- 有用户指出某个平台费用项缺失
- Search Console 开始出现 impressions

#### 第 2-3 个月

目标：

- 开始接入轻量 affiliate
- 根据 Search Console 扩展 2-4 个页面
- 优化计算完成率

预期收入：

```txt
$20-$150/月
```

健康信号：

- 月有效计算用户 > 500
- 自然搜索点击开始稳定
- affiliate 有点击但不影响工具使用

#### 第 4-6 个月

目标：

- 接入 AdSense 或替代广告
- 发布高级功能测试版
- 增加 1 个高质量西语页面

预期收入：

```txt
$100-$500/月
```

健康信号：

- 月 PV > 10,000
- 月有效计算用户 > 2,000
- 有自然外链或社区推荐
- 用户愿意为批量计算或报告导出付费

#### 第 7-12 个月

目标：

- 扩展批量 SKU、PDF 报告、多币种
- 建立费率更新机制
- 重点优化高收入页面

预期收入：

```txt
$300-$2,000/月
```

健康信号：

- 月 PV > 25,000
- 月有效计算用户 > 5,000
- 高级功能有稳定转化
- affiliate 收入不依赖单一合作方

### 11.6 盈亏平衡点

由于现金成本很低，项目现金盈亏平衡点不高。

如果月固定成本为 $10：

```txt
只靠广告：
所需 PV = 10 / RPM * 1000

RPM = $10 时，盈亏平衡 PV = 1,000
RPM = $20 时，盈亏平衡 PV = 500
```

如果加入时间成本，按每月维护 10 小时、机会成本 $25/小时计算：

```txt
真实月成本 = $10 + 10 * 25 = $260
```

达到真实盈亏平衡大约需要：

- 基准广告：15,000 PV * $15 RPM = $225，再加少量 affiliate 即可覆盖
- 或 9 个 $30 affiliate 成交
- 或 14 个 $19 高级功能购买

因此，本项目现金风险很低，但时间回报必须看 3-6 个月趋势。

### 11.7 关键敏感性

最影响收入的不是 RPM，而是有效计算用户和信任度。

优先优化顺序：

1. 计算完成率
2. 费率可信度
3. 页面加载速度
4. 搜索意图匹配
5. 用户可分享结果
6. affiliate 点击率
7. 广告 RPM

如果有效计算用户少，即使 RPM 高也没有意义。如果用户不信任费率，affiliate 和高级功能都不会转化。

### 11.8 收入目标和决策点

30 天：

- 收入目标：不考核
- 决策依据：有效计算、反馈、Search Console impressions

90 天：

- 收入目标：$20-$150/月
- 决策依据：是否有自然搜索点击和真实用户反馈

180 天：

- 收入目标：$100-$500/月
- 决策依据：是否值得继续扩展高级功能

365 天：

- 收入目标：$300-$2,000/月
- 决策依据：是否形成稳定工具资产，是否可复制到西语或其他平台

## 12. 30 天执行计划

### 第 1-2 天：关键词和竞品验证

交付物：

- 10 个关键词清单
- 10 个竞品页面截图和功能表
- 首版字段确认

验收：

- 找到至少 3 个“现有工具无法很好满足”的长尾意图
- 明确首版不做的功能

### 第 3-5 天：费率数据和公式

交付物：

- `rates.json`
- `rates.schema.ts`
- `shopify.ts`
- `tiktok.ts`
- `amazon-lite.ts`
- 单元测试

验收：

- 所有默认费率有来源
- 所有公式有测试样例
- 所有平台可手动覆盖费率

### 第 6-10 天：MVP UI

交付物：

- 单页计算器
- 三个平台卡片
- 成本构成图
- URL query 分享
- 移动端布局

验收：

- 输入即计算
- 390px、768px、1440px 布局正常
- 结果不会出现 NaN、Infinity

### 第 11-14 天：SEO 页面和发布准备

交付物：

- 首页/计算器页 metadata
- FAQ
- 免责声明
- sitemap
- robots.txt
- 4 篇高质量页面

验收：

- Lighthouse SEO 基本通过
- 页面包含费率来源和更新时间
- 无低价值批量内容

### 第 15-18 天：部署和分析

交付物：

- Cloudflare Pages 部署
- 自定义域名
- Google Search Console
- Plausible 或 Cloudflare Web Analytics
- 事件埋点

埋点事件：

- calculate_started
- calculate_completed
- platform_tab_changed
- rate_overridden
- result_copied
- affiliate_clicked

### 第 19-30 天：冷启动和迭代

交付物：

- 20 个社区回复
- 10 条用户反馈
- 1 次费率修正
- 1 次 UI 修正

验收：

- 真实用户开始使用
- 至少有人质疑或建议具体字段
- Search Console 出现 impressions

## 13. Go / No-Go 指标

### 继续投入的条件

30 天内满足至少 3 项：

- 500 次有效计算
- Search Console 2,000+ impressions
- 计算完成率 > 40%
- 用户手动覆盖费率比例 > 10%
- 社区收藏、转发或自然提及 > 5 次
- 至少 3 个用户提出具体功能建议

### 暂停或转向的条件

30 天后出现以下情况：

- 用户主要质疑准确性且无法通过数据治理解决
- Search Console impressions 极低
- 社区反馈认为官方计算器已经足够
- 只有泛流量，没有计算完成
- affiliate 点击早于工具信任建立，导致页面像广告站

## 14. 主要风险和应对

### 风险 1：费率不准

应对：

- 所有费率可手动覆盖
- 显示来源和更新时间
- 不承诺官方级准确
- Amazon 首版使用 Lite 模式

### 风险 2：SEO 起不来

应对：

- 不靠批量文章
- 每个页面嵌入真实工具
- 通过社区反馈获取第一批链接和使用数据
- 根据 Search Console impressions 调整页面

### 风险 3：TikTok Shop 费率变化快

应对：

- processing fee 独立 toggle
- affiliate commission 手动输入
- 默认值写明“verify in Seller Center”
- 维护 changelog

### 风险 4：变现影响信任

应对：

- 前 30 天不放广告
- affiliate 明确披露
- 链接用 sponsored
- 推荐区和计算结果分离

### 风险 5：范围膨胀

应对：

- 暂不做 TEMU
- 暂不做 Mercado Libre
- 暂不做税务自动计算
- 暂不做登录和数据库
- 暂不做批量 SKU，等验证后再上

## 15. 首版检查清单

- [ ] 输入售价、采购成本、运费后可同时计算 3 个平台
- [ ] 每个平台费用项清晰拆分
- [ ] 所有默认费率可覆盖
- [ ] 所有默认费率显示来源和更新时间
- [ ] Shopify 支持套餐和支付方式差异
- [ ] TikTok 支持 referral、processing、affiliate、ads
- [ ] Amazon 明确标注 Lite 模式
- [ ] ROI 和 margin 公式可解释
- [ ] 移动端布局不重叠
- [ ] URL query 可分享
- [ ] 结果不会出现 NaN 或 Infinity
- [ ] 页面包含免责声明
- [ ] affiliate 使用 `rel="sponsored noopener noreferrer"`
- [ ] 不发布低价值批量 AI 页面

## 16. 参考来源

- Amazon Seller Central: 2026 Updates to US Referral and Fulfillment by Amazon Fees  
  https://sellercentral.amazon.com/seller-forums/discussions/t/f3fa3211-820b-4e2e-a023-158a9cf55f99

- Shopify Pricing  
  https://www.shopify.com/pricing

- Shopify Help Center: Shopify Payments rates in the United States by card type  
  https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates

- TikTok Business Help Center: About setting different affiliate commission rates for TikTok Shop Ads  
  https://ads.tiktok.com/help/article/about-setting-different-affiliate-commission-rates-for-tiktok-shop-ads

- Google Search Central: Spam policies for Google Web Search  
  https://developers.google.com/search/docs/essentials/spam-policies

- Google Search Central: Guidance on using generative AI content  
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content

- Google Search Central: Qualify outbound links  
  https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
