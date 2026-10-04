# SOP: publishing a new article
1. Pick a keyword from `docs/keyword-tracker.csv` (status = planned). Check volume/difficulty in your SEO tool.
2. Create `src/content/articles/<slug>.md` (copy an existing file for the front-matter shape). `hub` must be one of: brewing, chai-black-tea, green-tea-matcha, herbal-tea, tea-gear, tea-wellness.
3. Write 1,500–2,500 words; use sub-keywords as H2s/FAQ questions (do not publish them as separate posts).
4. Link it from 2–3 related articles and from its hub; add `related:` slugs in front matter.
5. Run the editorial checklist, add the image, then `npm run build && npm run check:links`.
6. Merge to the default branch (production deploy runs), request indexing in Search Console, update the tracker.
7. Refresh cadence: evergreen every 6–12 months; update `modifiedDate` only for substantial edits.
