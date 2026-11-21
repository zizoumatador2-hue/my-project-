# Structured Data Map — BamaMotors.com

## How it's built
- Helpers live in `src/lib/seo.ts`: `organizationLd`, `websiteLd`, `breadcrumbLd`, `faqLd` and `itemListLd`. Page-specific objects are built in each page.
- Serialization goes through `src/components/JsonLd.astro`: `JSON.stringify`, with every `<` escaped to `<` so content can never close the `<script>`. A `null`/empty object renders nothing.
- All URLs are absolute (`absolute(SITE_URL, path)`). Dates are ISO 8601 values straight from the database.
- **Validation:**
  - `tests/integration/seo.test.ts` parses every JSON-LD block on every crawled page, and fails on invalid JSON or an empty `image` array.
  - For this audit, an extra required-property check was run on 18 page types and found 0 problems.
  - Before release, also check pages with Google's Rich Results Test and validator.schema.org.

## Map by page type

| Page type | Schema types | Data source | Required properties present | Optional | Eligibility / notes |
|---|---|---|---|---|---|
| Home `/` | Organization, WebSite + SearchAction, FAQPage | settings (name, email, social links), visible FAQ | Organization: name, url, logo. WebSite: name, url, potentialAction | `email` (settings), `sameAs` (only if social URLs are set), `areaServed: Alabama` | No address, phone or rating: BamaMotors has no public street address, and none is invented |
| Every page with breadcrumbs | BreadcrumbList | the same crumbs that are rendered visibly | itemListElement with position, name, item | — | Matches the visible breadcrumb |
| City landing `/used-cars/{city}-al` | BreadcrumbList, **FAQPage** (city-specific Q&A, visible), ItemList (only when listings exist) | `cities.faq_json`, live vehicles | FAQ: Question.name + acceptedAnswer.text | — | FAQPage is kept only here and on the pages listed below, because the questions are written for the page |
| Body, price, make, model and city×body landing pages | BreadcrumbList, ItemList (when listings exist) | live vehicles | — | — | **FAQPage removed in this pass**: the visible FAQ is a site-wide template, so it isn't marked up |
| Vehicle `/vehicles/{slug}` | BreadcrumbList, **Product + Car** with **Offer** | vehicles, vehicle_images, dealers | name, offers.price, priceCurrency=USD, availability (InStock / SoldOut), itemCondition | image (only when photos exist; **no empty array** since this pass), VIN/sku, mileage (`SMI`), bodyType, fuel, transmission, drivetrain, colors; seller AutoDealer with an address (null fields omitted) | No review or aggregateRating on vehicles. The templated vehicle FAQ is visible but **not** marked up (removed in this pass) |
| Dealer `/dealers/{slug}` | BreadcrumbList, AutoDealer | dealers, dealer_profiles, approved reviews | name, url, address | telephone, geo, openingHours (if entered by the dealer), **aggregateRating only when approved reviews exist** (count ≥ 1) | Ratings come only from reviews by signed-in users that an admin approved |
| Dealer directory `/dealers` | BreadcrumbList, FAQPage | visible FAQ | — | — | Unique questions |
| Guide `/blog/{slug}` | BreadcrumbList, BlogPosting, FAQPage and HowTo (only if the editor authored them) | blog_posts | headline, datePublished, dateModified, author (Organization: editorial team, linked to the author page), image (cover), mainEntityOfPage | publisher | `dateModified` changes only when the editor ticks "substantial update" |
| Blog index `/blog` | BreadcrumbList, Blog | — | name, url | — | — |
| Category `/blog/category/{slug}` | BreadcrumbList, **CollectionPage** (new) | categories | name, url, description | isPartOf → WebSite | — |
| Author `/authors/{slug}` | BreadcrumbList, ProfilePage | users.author_* | mainEntity (Person/Organization name, description) | — | The byline is the real editorial team, not an invented person |
| About `/about` | BreadcrumbList, AboutPage, Organization | page content | — | — | — |
| How it works | BreadcrumbList, HowTo | visible steps | name, step | — | — |
| FAQ, Financing, For Dealers | BreadcrumbList, FAQPage | visible Q&A | — | — | Unique questions |
| Legal and utility pages | BreadcrumbList | — | — | — | — |

## Deliberately not used
- **LocalBusiness / AutoDealer for BamaMotors itself:** it is an online marketplace with no public location.
- **Review / AggregateRating on Organization, vehicles or landing pages:** there is no eligible first-party review data.
- **Product AggregateOffer on landing pages:** the price tables are visible, but Google's merchant listing rules expect offers from one seller, and these lists come from many dealers.
- **VideoObject, Event, Course, SoftwareApplication:** no such content.

## Note on FAQ rich results
Since 2023 Google shows FAQ rich results mainly for authoritative government and health sites. FAQPage markup is kept only where it is truthful and unique, because it still helps machines (and AI answer engines) map questions to answers. It is not expected to produce FAQ snippets in Google.
