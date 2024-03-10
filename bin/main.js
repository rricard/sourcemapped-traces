#!/usr/bin/env node
// @ts-check
import { findSourcesInProfile, decodeCpuProfile } from "../lib/mod.js";
import { readFile, writeFile } from "node:fs/promises";

async function main(args) {
  const [_, __, profilePath, sourceMapPath, outPath] = args;
  const profileJson = JSON.parse(await readFile(profilePath, "utf8"));
  const sourceMapJson = JSON.parse(await readFile(sourceMapPath, "utf8"));
  const sourceFiles = findSourcesInProfile(profileJson);
  /** @type {Record<string, typeof sourceMapJson>} */
  const sourceMaps = {};
  for (const sourceFile of sourceFiles) {
    if (sourceFile.startsWith("node:")) continue;
    if (!sourceFile.endsWith(".js")) continue;
    sourceMaps[sourceFile] = sourceMapJson;
  }
  const [mappedProfileJson, sourceMisses] = await decodeCpuProfile(
    profileJson,
    sourceMaps
  );
  console.warn("Source misses", sourceMisses);
  await writeFile(
    outPath ?? `${profilePath}.mapped`,
    JSON.stringify(mappedProfileJson)
  );
}

main(process.argv);
