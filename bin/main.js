#!/usr/bin/env node
// @ts-check
import { decodeCpuProfile, decodeHeapProfile } from "../lib/mod.js";
import { readFile, writeFile } from "node:fs/promises";

const HELP_TEXT = `
USAGE: sourcemapped-traces cpu CPUPROFILE_FILE SOURCEMAP_FILE [DECODED_OUTPUT_FILE]
USAGE: sourcemapped-traces heap HEAPPROFILE_FILE SOURCEMAP_FILE [DECODED_OUTPUT_FILE]`;

async function main(args) {
  if (args.length < 5 || args.length > 6) {
    console.error(HELP_TEXT);
    process.exit(1);
  }
  const [_, __, type, profilePath, sourceMapPath, outPath] = args;
  const profileJson = JSON.parse(await readFile(profilePath, "utf8"));
  const sourceMapJson = JSON.parse(await readFile(sourceMapPath, "utf8"));
  let result;
  if (type === "cpu") {
    const { inputMisses: inputFiles } = await decodeCpuProfile(profileJson, {});
    /** @type {Record<string, typeof sourceMapJson>} */
    const sourceMaps = {};
    for (const inputFile of inputFiles.values()) {
      if (inputFile.startsWith("node:")) continue;
      if (!inputFile.endsWith(".js")) continue;
      sourceMaps[inputFile] = sourceMapJson;
    }
    result = await decodeCpuProfile(profileJson, sourceMaps);
  } else if (type === "heap") {
    const { inputMisses: inputFiles } = await decodeHeapProfile(
      profileJson,
      {}
    );
    /** @type {Record<string, typeof sourceMapJson>} */
    const sourceMaps = {};
    for (const inputFile of inputFiles.values()) {
      if (inputFile.startsWith("node:")) continue;
      if (!inputFile.endsWith(".js")) continue;
      sourceMaps[inputFile] = sourceMapJson;
    }
    result = await decodeHeapProfile(profileJson, sourceMaps);
  } else {
    console.error(HELP_TEXT);
    process.exit(1);
  }
  const { decoded, inputMisses } = result;
  console.warn("Input misses", inputMisses);
  await writeFile(outPath ?? `${profilePath}.decoded`, JSON.stringify(decoded));
}

main(process.argv);
