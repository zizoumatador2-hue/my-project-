# Product Truth Map: BamaMotors

How the product is meant to work, taken from the code, schema, README, tests and production state (D1 queried 2026-10-11).

## What it is
- **Purpose:** a used-car marketplace and lead-generation site for Alabama.
  - Dealers list inventory; shoppers search and contact the dealer.
  - BamaMotors doesn't sell cars, take deposits or lend money.
  - Revenue comes from dealer subscription plans and paid featured listings.
- **Users:**
  - **Shoppers** (anonymous or a `consumer` account).
  - **Dealers** (a `dealer` account that owns one dealership).
  - **Admins.** The `BOOTSTRAP_ADMIN_EMAIL` account becomes admin on sign-up, and admins can promote other users.
- **Data ownership:**
  - A dealer owns its dealership row, vehicles, photos (R2) and leads.
  - Shoppers own their saved vehicles, inquiries and reviews.
  - Deleting a dealer account cascades to its dealership, vehicles, image rows and leads.
- **Production today:**
  - bamamotors.com is live.
  - 0 vehicles, 0 dealers, 2 admin accounts.
  - Email (Resend), Stripe and Turnstile are **not configured**.

## Critical flows
1. Shopper searches (filters, ZIP radius, "use my location"), opens a listing and sends a lead (contact, info, price, test drive or financing).
2. Dealer signs up. An admin approves the dealer. The dealer adds vehicles with photos, and they appear in search, landing pages and sitemaps.
3. Dealer works leads: New → Contacted → Qualified → Converted / Closed, with replies and notes.
4. Dealer upgrades plan or buys a featured slot: Stripe Checkout when configured, otherwise a manual request that an admin approves.
5. Admin moderates dealers, vehicles, reviews and users, and edits content (blog, cities, makes/models, settings).

## 1. Fully implemented (verified by integration or e2e tests)
- **Accounts:**
  - Sign-up, login and logout with PBKDF2 and hashed session tokens.
  - Role-based access, rate limits and an origin check on POSTs.
- **Search:** 15 filters, 7 sort orders, pagination, ZIP or city radius (bounding box + exact distance), "use my location" via `/api/nearest-zip`.
- **Vehicle pages:**
  - Gallery, specs and the dealer-disclosed history.
  - NHTSA recall and NMVTIS links.
  - Payment estimate (labelled as an estimate) and similar vehicles.
  - Saved-vehicle toggle.
- **Leads:**
  - Stored in D1 with an in-app notification to the dealer, or to admins for site leads.
  - Dealer and admin lead pipeline with status, replies and internal notes.
- **Dealer dashboard:**
  - Inventory create, edit, bulk status and delete, with plan vehicle limits.
  - Multi-photo upload (resized to WebP in the browser, magic-byte checked on the server, stored in R2), ordering and cover photo.
  - Logo, profile and hours.
  - Analytics: views per day, leads and top vehicles.
- **Reviews:** signed-in shoppers submit; admins moderate. AggregateRating is computed only from approved reviews.
- **Admin:**
  - Dealer approval and suspension, vehicles, leads, users (roles and status), featured listings.
  - Subscriptions (manual plan approval) and review moderation.
  - Blog CMS with FAQ/HowTo, categories, city content, makes and models.
  - Contact messages and email outbox, reports with CSV export, site settings (GA4, AdSense, Search Console codes, contact email, featured price).
- **Content and SEO:** 20 guides, 12 city guides, landing pages by city, body type, price, make and model, sitemaps, robots, structured data and redirects for changed slugs. See `docs/seo/`.

## 2. Partially implemented (works, but depends on setup the owner hasn't done)
| Feature | Works today | Missing |
|---|---|---|
| Transactional email (lead copies, lead alerts to dealers, dealer approval, replies to shoppers) | Every message is written to `email_outbox` and visible in Admin → Messages. | `RESEND_API_KEY` secret and a verified sending domain. Until then, **no email is delivered**. |
| Password reset | Token creation and the reset page work. | Needs email delivery. **The page now says so** instead of claiming a link was sent. |
| Online billing (plans, featured listings) | Stripe Checkout, Billing Portal and signed webhook code paths exist. | Stripe keys and price IDs. Without them, dealers submit requests and admins approve and invoice manually; no payment is simulated. |
| Turnstile bot check | Verifies when keys are set. | Keys. Without them, honeypots and rate limits are the only bot protection. |
| GA4, AdSense, Search Console | Script and meta injection from Admin → Settings. | The owner's IDs. |
| `bamamoutours.com` redirect | The deploy attaches it automatically once it exists. | The domain isn't on the Cloudflare account. |

## 3. UI-only (no backend effect)
- **Before this pass:** admin notifications were written but **never displayed**, so a dealer's featured-listing request (when Stripe is off) reached nobody. **Fixed:** the admin overview now lists them.
- **After this pass:** none known.

## 4. Mocked
- None.
  - No mocked API responses or fake payment success.
  - The honeypot "success" on the lead and contact forms is deliberate anti-spam, not a mock.

## 5. Broken (before this pass)
- `http://` was served without redirecting to HTTPS. **Fixed.**
- Nothing else was broken. Vehicle option validation was split between the schema and a manual pass, and is now consolidated (see the audit, row 5).

## 6. Unused (before this pass)
- The Pexels image fetcher (0 images from Pexels; keys no longer issued). **Removed.**
- 4 dead exports. **Removed.**
- `audit_log` is written but not displayed. Kept as a write-only audit trail.

## 7. Unknown
- Whether the owner wants the decorative motion effects kept long term (added on request).
- The legal operating entity behind the site. The Terms and Privacy pages name "BamaMotors" only.
