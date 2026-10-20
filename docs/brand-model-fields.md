# Brand and model fields

Cars (`cars`), phones/tablets (`phones`) and gaming/consoles (`gaming`) use
the existing category → subcategory → field structure. Model is a SELECT
field whose `dependsOnId` points to Brand. Its JSON choices retain
`value` and translated `labels`, and add `parentValues` (Brand option values).

## Behavior

- Search hides Model until a brand is selected. Selecting a brand reveals
  matching models immediately, without a network request. Apply submits both.
- Changing/clearing Brand clears Model. Reloading a search restores both.
- Listing creation/editing uses the same choices and clears dependent answers.
- Services call `validateAttributes` before writing. Unknown choices, missing
  parents and mismatched brand/model combinations are rejected for web and mobile.
- Other remains available per brand. The starter list is intentionally not an
  exhaustive manufacturer database; admins can extend it.

Brand/model choices also include a snapshot of the expanded public filters at
[Cars](https://www.kleinanzeigen.de/s-autos/c216),
[Smartphones](https://www.kleinanzeigen.de/s-handy-telekom/c173) and
[Consoles](https://www.kleinanzeigen.de/s-konsolen/c279).
`prisma/brand-model-reference.json` records the check date, brand-page URLs and
observed model names. There are no live requests to that site from the app.
The upgrade adds missing choices while retaining existing extras and stable values.
Brand/model aliases such as Steam/Valve and Xbox/Xbox Original are merged.
Some phone brands expose no public Model filter; their existing starter models
remain available in ShitjaKos.

- Phones includes tablets and Gaming includes games/accessories, so new fields
  are optional. Existing required phone fields keep their original requirement.

## Admin

Catalog → subcategory → Model → Edit field:

1. Select an independent SELECT field under **Depends on**.
2. Assign every choice to one or more parent choices.
3. Filter the choice editor by brand or search for a choice.
4. Add brands by editing Brand, then add matching choices by editing Model.

To create a new dependent field, first create its ordinary SELECT field, then
edit it to configure the dependency before listings use it.
Dependencies of used fields/choices cannot be reassigned, and parent choices
referenced by models cannot be removed. Stable values preserve saved searches.

## Mobile

`GET /api/v1/categories` returns `dependsOnId` and `options[].parentValues`.
The mobile client should hide Model until Brand is selected, filter choices by
the selected parent value, and clear Model when Brand changes.
Submit the original option values in the existing `attributes` object.
No new auth or listing endpoint is needed. Existing TEXT-model clients need to
switch to these choices; arbitrary new free-text models are no longer accepted.

## Setup and deployment

After applying the additive `attribute_dependencies` migration and generating
Prisma:

```sh
npm run db:catalog:models
```

This transactional, repeatable command updates only the three catalogs. It
preserves brand IDs/values and all saved model answers, converts existing
phone model text into matching brand-scoped choices, and adds starter options.
Ambiguous legacy data aborts the whole operation instead of discarding answers.
Do not use a database reset. The regular seed also calls this catalog setup and
preserves configured dependencies.

Web catalog reads are cached for five minutes; admin writes invalidate the
cache. A standalone setup command cannot invalidate a running Next cache:
allow five minutes or restart the development server after setup.
