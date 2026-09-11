import "server-only";
import { parseEnvironment, productionDeployment } from "./environment-policy";

export function isProductionDeployment(): boolean {
  return productionDeployment(process.env);
}

let config: ReturnType<typeof parseEnvironment> | undefined;

export function validateEnvironment(): void {
  config ??= parseEnvironment(process.env);
}

/** Only normalized, validated configuration crosses the server boundary. */
export function serverEnv() {
  validateEnvironment();
  return config!;
}
