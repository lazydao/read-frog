import { createEnv } from "@t3-oss/env-core"
import { createExtensionClientEnvSchema, resolveExtensionEnv } from "./shared"

// Read Frog Core does not use the upstream hosted auth or analytics services.
// Keep runtime configuration optional unless a release maintainer explicitly
// opts back into validating those variables.
const shouldSkipRequiredProductionEnv = import.meta.env.WXT_VALIDATE_ENV !== "true"
const extensionClientEnvSchema = createExtensionClientEnvSchema(
  import.meta.env.PROD,
  shouldSkipRequiredProductionEnv,
)

export const env = createEnv({
  clientPrefix: "WXT_",
  client: extensionClientEnvSchema,
  runtimeEnv: resolveExtensionEnv(import.meta.env),
  emptyStringAsUndefined: true,
})
