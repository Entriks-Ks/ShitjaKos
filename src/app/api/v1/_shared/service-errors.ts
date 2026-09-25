// Translate existing service errors at the HTTP boundary without changing services.
const forbidden = new Set([
  "Not authorized.",
  "Admin access is required.",
  "Not authorized to update this business.",
  "Only an active admin can perform this action.",
  "Only the active business owner can delete this shop.",
  "You cannot edit this listing.",
  "You cannot change this listing.",
  "You cannot delete this listing.",
  "You cannot list for this business.",
  "Account suspended.",
  "Your account is suspended.",
  "This account is suspended.",
  "Your account is unavailable.",
  "This account cannot save listings.",
  "An active, verified account is required.",
  "Verify your email before creating a listing.",
]);
const conflicts = new Set([
  "This listing changed in another tab. Reload before editing.",
  "Listing changed. Please retry.",
  "The listing changed. Reload and try again.",
]);
const missing = new Set([
  "User not found.",
  "Business not found.",
  "Category not found.",
  "Field not found.",
  "This listing is no longer available.",
]);
const invalid = new Set([
  "Choose an available subcategory.",
  "Personal profile missing.",
  "Listing ownership cannot be changed.",
  "Closed listings cannot be edited.",
  "This status change is not allowed.",
  "This listing is blocked from publication.",
  "Add at least one photo before publishing.",
  "Your business must be approved before publishing.",
  "Only businesses require review.",
  "You cannot review your own business.",
  "You cannot suspend or restore your own account.",
  "Admin accounts are protected on this screen.",
  "Choose an active category group.",
  "Categories can only have one subcategory level.",
  "A category with this English name already exists here.",
  "Every field in the batch needs a different English name.",
  "Choose an active subcategory for these fields.",
  "This subcategory already has listings. Add new fields as optional.",
  "A subcategory can currently have one choice filter in search.",
  "Choose a category.",
  "Restore the parent category first.",
  "Delete or move this category’s subcategories first.",
  "This subcategory has listings. Archive it instead.",
  "A field in this subcategory has saved answers. Archive the category instead.",
  "Choose a field.",
  "This field has saved listing answers and cannot be deleted.",
  "Delete this shop's listings first, including drafts, sold, and closed listings.",
  "An attribute does not belong to this category.",
]);
export function serviceErrorStatus(error: unknown) {
  if (!(error instanceof Error) || error.constructor !== Error) return undefined;
  if (forbidden.has(error.message)) return 403;
  if (conflicts.has(error.message)) return 409;
  if (missing.has(error.message)) return 404;
  if (invalid.has(error.message)) return 422;
  // Field-validation text is generated from field names; never expose that text.
  if (
    /^(?:Field “.{1,80}” has duplicate English choice names\.|The field “.{1,80}” already exists here\.|.{1,100} (?:is required|must be a number|is outside the allowed range|must be yes or no|is invalid|cannot be blank|is not a valid option)\.)$/u.test(
      error.message,
    )
  )
    return 422;
  return undefined;
}
