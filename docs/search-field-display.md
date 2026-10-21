# Search field display

In Admin > Catalog, create or edit a SELECT field and choose **Display in search filters**: DROPDOWN, RADIO, or CHECKBOX. Existing fields default to DROPDOWN. This setting affects the sidebar and advanced search; listing answers remain single values.

Checkbox searches use OR within a field and AND across fields. Select at most 50 values per field. Long option lists scroll. Changing a parent clears dependent selections; models are the union of selected brands. Apply filters updates the URL; Clear removes them.

## Mobile API

Category attributes expose `filterDisplay`. Render the appropriate control in the mobile client. Dropdown/radio use `field_<id>=value`. Checkbox search uses a URL-encoded JSON array in `choices_<id>`, for example `choices_brand=["bmw","audi"]`. Do not send both keys for one field. Saved searches accept the same representation. Listing create/update answers are unchanged.

## Database

The additive migration `20261021120000_attribute_filter_display` adds the display column with a dropdown default and a constraint. It preserves all existing fields and answers.
