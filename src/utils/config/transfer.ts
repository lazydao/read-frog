import type { Config } from "@/types/config/config"
import { migrateConfig } from "./migration"

interface ConfigTransferFile {
  schemaVersion?: unknown
  config?: unknown
}

export async function parseConfigTransferFile(fileContent: string): Promise<Config> {
  const parsed = JSON.parse(fileContent) as ConfigTransferFile

  if (typeof parsed.schemaVersion !== "number" || !Number.isInteger(parsed.schemaVersion)) {
    throw new TypeError("Invalid config schemaVersion")
  }

  if (parsed.config === undefined) {
    throw new TypeError("Missing config payload")
  }

  return migrateConfig(parsed.config, parsed.schemaVersion)
}
