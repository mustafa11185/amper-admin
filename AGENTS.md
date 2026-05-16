<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Product Isolation Rule (قاعدة عزل المنتجات) — 2026-05-16

The Endur Console hosts multiple products (Amper, RestoIQ, Buraq).
Where any screen lives is decided by ONE question:

> Does this concern exactly ONE product, or the company / all products?

- **Product-specific** → inside that product's hub tab only:
  - `/products/amper`   (sections: clients, plans, finance, reports, app-versions)
  - `/products/restoiq` (sections: overview, customers, branches, …)
  - `/products/barq`    (future)
  Add it as a section in `_components/*Section.tsx`, register it in
  the hub's `*SectionNav.tsx` + `page.tsx`. Never add a new
  top-level sidebar entry for product-specific work.

- **Company-general** (Endur itself) → top-level sidebar:
  team, company settings, system settings, announcements, dashboard.

- **Cross-product** (aggregates/compares all products) → top-level:
  products overview, unified Endur reports, SaaS billing, tickets,
  leads.

## Billing sub-rule

Invoices are **company-level** (Endur is the legal seller) but
**product-tagged** at the line-item level (`EndurInvoiceLine.product_id`).
There is exactly ONE invoices screen: `/endur-invoices`. Do NOT
create per-product invoice screens.

Navigation between billing and product tabs is **bidirectional and
context-preserving**:

- **General → Product**: clicking a product badge on an invoice row
  → `/products/<key>?customer=<id>#<customers-anchor>` (product tab,
  pre-filtered to that customer).
- **Product → General**: a "🧾 الفاتورة" action on a customer/
  subscription row → `/endur-invoices?customer_id=<id>&product=<KEY>`
  (invoices screen, pre-filtered + a context banner).

The `customer_id` filter is honoured by `GET /api/endur-invoices`.
The product → route map lives in `endur-invoices/page.tsx`
(`PRODUCT_ROUTE`). Keep both directions in sync when adding a product.

## Side-nav pattern

Product hubs are single-page + scroll-spy, mirroring the RestoIQ
manager web's `/manage` SectionShell: 140px aside, text-only nav
(no icons), 13px font, 36px rows, right-edge brand stripe on the
active item, 20px column gap, plain `<h2>` section headings (no
numbered badges). New product hubs MUST match this so the console
feels uniform.
