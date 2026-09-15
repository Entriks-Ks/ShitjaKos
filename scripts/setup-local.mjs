import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env")) {
  writeFileSync(
    ".env",
    `DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"\nBETTER_AUTH_SECRET="${randomBytes(48).toString("hex")}"\nBETTER_AUTH_URL="http://localhost:3001"\nMAIL_MODE="file"\n`,
    { mode: 0o600 },
  );
  console.log(
    "Created local .env. Start npm run db:local, then npm run db:deploy and npm run db:seed.",
  );
} else console.log(".env already exists and was preserved.");
