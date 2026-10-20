import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { createOrderFixtures } from "../../../../scripts/tests/support/order-fixtures.mjs";
export const {
  backend,
  password,
  users,
  sql,
  setup,
  customer,
  configure,
  cleanup,
  address,
} = createOrderFixtures({
  createClient,
  envFile:
    process.env.LUMIQ_TEST_ENV_FILE ||
    path.resolve(
      __dirname,
      "../../../../.lumiq-local/test.env",
    ),
});
