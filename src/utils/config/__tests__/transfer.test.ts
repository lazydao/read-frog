import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG, CONFIG_SCHEMA_VERSION } from "@/utils/constants/config"
import { getObjectWithoutAPIKeys } from "../api"
import { parseConfigTransferFile } from "../transfer"

describe("parseConfigTransferFile", () => {
  it("parses a current TransFrog config export", async () => {
    const imported = await parseConfigTransferFile(
      JSON.stringify({
        schemaVersion: CONFIG_SCHEMA_VERSION,
        config: DEFAULT_CONFIG,
      }),
    )

    expect(imported.language).toEqual(DEFAULT_CONFIG.language)
    expect(imported.translate.providerId).toBe(DEFAULT_CONFIG.translate.providerId)
  })

  it("accepts exports without API keys", async () => {
    const imported = await parseConfigTransferFile(
      JSON.stringify({
        schemaVersion: CONFIG_SCHEMA_VERSION,
        config: getObjectWithoutAPIKeys(DEFAULT_CONFIG),
      }),
    )

    expect(imported.providersConfig).toHaveLength(DEFAULT_CONFIG.providersConfig.length)
  })

  it.each([
    ["missing schema version", { config: DEFAULT_CONFIG }, "Invalid config schemaVersion"],
    [
      "non-integer schema version",
      { schemaVersion: 86.5, config: DEFAULT_CONFIG },
      "Invalid config schemaVersion",
    ],
    ["missing config", { schemaVersion: CONFIG_SCHEMA_VERSION }, "Missing config payload"],
  ])("rejects an export with %s", async (_name, payload, expectedMessage) => {
    await expect(parseConfigTransferFile(JSON.stringify(payload))).rejects.toThrow(expectedMessage)
  })
})
