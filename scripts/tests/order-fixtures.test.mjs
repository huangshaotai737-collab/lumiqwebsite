import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOrderFixtures } from "./support/order-fixtures.mjs";
test("shared order fixtures refuse remote or credential-disguised endpoints before SDK access", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "c4-fixture-guard-"));
  try {
    for (const endpoint of [
      "https://remote.example",
      "http://127.0.0.1.evil.example:54321",
      "http://127.0.0.1:54321@remote.example",
      "file:///tmp/test",
      "not a URL",
    ]) {
      const envFile = path.join(root, "test.env");
      await writeFile(
        envFile,
        `API_URL=${endpoint}\nANON_KEY=synthetic\nSERVICE_ROLE_KEY=synthetic\n`,
      );
      let called = false;
      assert.throws(
        () =>
          createOrderFixtures({
            envFile,
            createClient: () => {
              called = true;
              return {};
            },
          }),
        /Local test only/,
      );
      assert.equal(called, false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("shared lifecycle attempts durable restoration and user cleanup even when order deletion fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "c4-fixture-finally-"));
  try {
    const envFile = path.join(root, "test.env");
    await writeFile(
      envFile,
      "API_URL=http://127.0.0.1:54321\nANON_KEY=synthetic\nSERVICE_ROLE_KEY=synthetic\n",
    );
    const queries = [],
      deleted = [];
    const id = "c4000000-0000-4000-8000-000000000099";
    const fixtures = createOrderFixtures({
      envFile,
      createClient: () => ({
        auth: {
          admin: {
            createUser: async () => ({ data: { user: { id } }, error: null }),
            deleteUser: async (userId) => {
              deleted.push(userId);
              return { error: null };
            },
          },
        },
        from: () => ({ insert: async () => ({ error: { synthetic: true } }) }),
      }),
      runSql: (query) => {
        queries.push(query);
        if (query.startsWith("delete")) throw Error("synthetic delete failure");
        return "";
      },
    });
    await assert.rejects(fixtures.setup(), /order cleanup failed/);
    assert.equal(
      queries.some(
        (q) =>
          q.includes("private.c4_browser_publication") &&
          q.includes("drop table"),
      ),
      true,
    );
    assert.deepEqual(deleted, [id]);
    assert.deepEqual(fixtures.users, {});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
