import "server-only";
import { countries } from "@/lib/catalog";
import { endpoint } from "@/app/api/v1/_shared/http";
import * as reads from "@/app/api/v1/_shared/reads";

export const catalogGet = endpoint(async () => reads.readCatalog());
export const locationsGet = endpoint(async () => ({ countries }));
