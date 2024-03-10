#!/usr/bin/env node
// @ts-check
import { decodeCpuProfile } from "../lib/mod.js";
import { readFile, writeFile } from "node:fs/promises";

async function main(args) {
  const [_, __, profilePath, sourceMapPath, outPath] = args;
  const profileJson = JSON.parse(await readFile(profilePath, "utf8"));
  const sourceMapJson = JSON.parse(await readFile(sourceMapPath, "utf8"));
  const { sourceMisses: sourceFiles } = await decodeCpuProfile(profileJson, {});
  /** @type {Record<string, typeof sourceMapJson>} */
  const sourceMaps = {};
  for (const sourceFile of sourceFiles.values()) {
    if (sourceFile.startsWith("node:")) continue;
    if (!sourceFile.endsWith(".js")) continue;
    sourceMaps[sourceFile] = sourceMapJson;
  }
  const { decoded, sourceMisses } = await decodeCpuProfile(
    profileJson,
    sourceMaps
  );
  console.warn("Source misses", sourceMisses);
  await writeFile(outPath ?? `${profilePath}.mapped`, JSON.stringify(decoded));
}

main(process.argv);
