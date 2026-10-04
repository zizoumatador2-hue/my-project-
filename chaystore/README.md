# ChayStore.com

US-oriented storefront (premium loose-leaf tea) for **chaystore.com**. Static site: `index.html`, `styles.css`, `app.js` — no build step.

Preview: `cd chaystore && python3 -m http.server 8080`

Deploy: Cloudflare Pages (build output dir `chaystore`) or any static host, then point the chaystore.com DNS at it.

Before launch: wire checkout to Stripe/Shopify, replace emoji with product photos, add real contact/email handling, privacy & terms pages, and sales-tax setup.
