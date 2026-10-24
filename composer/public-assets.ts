import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Actual public files only: never infer cacheability from an API's suffix. */
export async function publicAssetPaths(root: string, names: readonly string[]) {
  const paths: string[] = [];
  for (const name of names) {
    const directory = join(root, "apps", name, "public");
    const mount = name === "site" ? "" : `/${name}`;
    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) await walk(file);
        else if (entry.isFile())
          paths.push(
            `${mount}/${relative(directory, file).split(sep).map(encodeURIComponent).join("/")}`,
          );
      }
    }
    await walk(directory);
  }
  return paths.sort();
}
