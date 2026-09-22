import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  // Layer boundary: the database client belongs to the repository layer.
  // Services hold the business rules and reach the database through it;
  // actions, pages and route handlers go through services.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/repositories/**",
      // The client factory, and better-auth's Prisma adapter, which needs the
      // client instance rather than a repository function.
      "src/lib/prisma.ts",
      "src/lib/auth.ts",
      // The mobile auth flow is excluded from the layering on purpose.
      "src/lib/mobile-auth.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Query the database from src/repositories and call that from a service.",
            },
            {
              name: "./prisma",
              message:
                "Query the database from src/repositories and call that from a service.",
            },
          ],
          patterns: [
            {
              group: ["@/generated/prisma/client"],
              importNames: ["PrismaClient"],
              message: "Only the repository layer instantiates the Prisma client.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
