import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { publicAssetPaths } from "./public-assets.ts";

test("public file inventory follows mounts, URL encodes segments and excludes directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "web-public-assets-"));
  try {
    for (const name of ["site", "blog"]) {
      const dir = join(root, "apps", name, "public", "a space");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "image.png"), "image");
    }
    assert.deepEqual(await publicAssetPaths(root, ["site", "blog"]), [
      "/a%20space/image.png",
      "/blog/a%20space/image.png",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
