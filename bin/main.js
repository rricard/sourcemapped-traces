#!/usr/bin/env node
// @ts-check
import { findSourcesInProfile, decodeCpuProfile } from "../lib/mod.js";
import { readFile, writeFile } from "node:fs/promises";

async function main(args) {
  const [_, __, profilePath, sourceMapPath] = args;
  console.log(args);
  const profileJson = JSON.parse(await readFile(profilePath, "utf8"));
  const sourceMapJson = JSON.parse(await readFile(sourceMapPath, "utf8"));
  const sourceFiles = findSourcesInProfile(profileJson);
  /** @type {Record<string, typeof sourceMapJson>} */
  const sourceMaps = {};
  for (const sourceFile of sourceFiles) {
    if (sourceFile.startsWith("node:")) continue;
    sourceMaps[sourceFile] = sourceMapJson;
  }
  const mappedProfileJson = await decodeCpuProfile(profileJson, sourceMaps);
  const mappedPath = `${profilePath}.mapped`;
  await writeFile(mappedPath, JSON.stringify(mappedProfileJson));
}

main(process.argv);
