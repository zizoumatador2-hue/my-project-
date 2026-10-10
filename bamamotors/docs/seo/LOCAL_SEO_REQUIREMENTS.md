# Local SEO Requirements — BamaMotors.com

## Classification
BamaMotors itself is **not a local business**: it is an online marketplace with no storefront, public address, phone or opening hours. So:
- No LocalBusiness or AutoDealer markup for BamaMotors, and no Google Business Profile claim for it.
- `Organization` schema carries `areaServed: Alabama` (true: the service covers Alabama only) and no address. No address or phone is invented.

## Local entities that *are* local: dealerships
Each active dealer profile `/dealers/{slug}` is a real local business page:

| Element | Source | Status |
|---|---|---|
| Business name | dealer sign-up, verified by an admin before going live | ✔ |
| Street address, city, ZIP | dealer profile | ✔ rendered visibly and in `AutoDealer.address` |
| Phone | dealer profile | ✔ visible and `tel:` link; `telephone` in schema only when present |
| Opening hours | dealer profile (per weekday) | ✔ visible table; `openingHours` only for days that aren't closed |
| Coordinates | geocoded from the ZIP centroid | ✔ `geo` in schema (approximate, ZIP-level, not rooftop) |
| Map link | Google Maps search link built from the address | ✔ |
| Reviews | signed-in users, admin-approved | ✔ `aggregateRating` only when ≥ 1 approved review |
| License number | dealer profile | shown when provided |

Consistency rule: the schema reads from the same fields as the visible text, so name, address and phone can never diverge.

## City pages are not "thin city swaps"
The 12 `/used-cars/{city}-al` pages each have 300+ words of city-specific copy:
- metro suburbs and highways
- climate effects (Gulf salt air, hurricanes, summer heat)
- county registration notes
- a city FAQ

They also show live local inventory, price ranges and nearby dealers. Cities without real knowledge are not added: the list is limited to 12 researched cities.

## Owner actions
1. Onboard dealers. Every approved dealer adds a real local entity page.
2. Encourage dealers to complete their hours, phone and photos in the dashboard.
3. Do **not** create pages for further cities until there is unique local content or inventory there.
