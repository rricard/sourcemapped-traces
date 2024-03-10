#!/usr/bin/env node
// @ts-check
import { decodeCpuProfile } from "../lib/mod.js";
import { readFile, writeFile } from "node:fs/promises";

async function main(args) {
  const [_, __, profilePath, sourceMapPath, outPath] = args;
  const profileJson = JSON.parse(await readFile(profilePath, "utf8"));
  const sourceMapJson = JSON.parse(await readFile(sourceMapPath, "utf8"));
  const { inputMisses: inputFiles } = await decodeCpuProfile(profileJson, {});
  /** @type {Record<string, typeof sourceMapJson>} */
  const sourceMaps = {};
  for (const inputFile of inputFiles.values()) {
    if (inputFile.startsWith("node:")) continue;
    if (!inputFile.endsWith(".js")) continue;
    sourceMaps[inputFile] = sourceMapJson;
  }
  const { decoded, inputMisses } = await decodeCpuProfile(
    profileJson,
    sourceMaps
  );
  console.warn("Input misses", inputMisses);
  await writeFile(outPath ?? `${profilePath}.mapped`, JSON.stringify(decoded));
}

main(process.argv);
