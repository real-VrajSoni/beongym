import "dotenv/config";
import { spawnSync } from "node:child_process";
import { assertDisposableDatabase } from "./disposable-database";

assertDisposableDatabase();
const result = spawnSync("npx", ["prisma", "migrate", "reset", "--force"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
