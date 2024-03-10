// @ts-check
import { SourceMapConsumer } from "source-map";

/**
 * Decodes sourcemapped symbols in JSON CPU Profile data.
 *
 * You can provide one sourcemap JSON data per input file that appears in the
 * CPU profile. All misses will be returned as `inputMisses`.
 *
 * Do note that not most input misses are not problematic, for instance, we fully
 * expect node intrinsic modules such as "node:fs" to not be sourcemapped.
 *
 * It is however very likely that you will want to have all files ending with ".js"
 * mapped...
 *
 * @param {import("./types").CpuProfile} profileJson The profile JSON data to decode
 * @param {Record<string, import("source-map").RawSourceMap>} sourceMapJsons
 * A map of file uris to source map JSON data
 * @returns {Promise<{ decoded: import("./types").CpuProfile, inputMisses: Set<string> }>}
 * A promise of the decoded profile with the set of input file uri misses during that decoding
 */
export async function decodeCpuProfile(profileJson, sourceMapJsons) {
  /** @type {Record<string, import("source-map").SourceMapConsumer>} */
  let consumers = {};
  for (const [url, sourceMapJson] of Object.entries(sourceMapJsons)) {
    consumers[url] = await new SourceMapConsumer(sourceMapJson, url);
  }
  const inputMisses = new Set();
  const decoded = {
    ...profileJson,
    nodes: profileJson.nodes.map((node) => {
      const callFrame = node.callFrame;
      const consumer = consumers[callFrame.url];
      if (!consumer) {
        inputMisses.add(callFrame.url);
        return node;
      }
      if (callFrame.lineNumber < 0) return node;
      const { source, line, column, name } = consumer.originalPositionFor({
        line: callFrame.lineNumber + 1,
        column: callFrame.columnNumber,
      });
      return {
        ...node,
        callFrame: {
          ...callFrame,
          functionName: name ?? callFrame.functionName,
          url: source ?? callFrame.url,
          lineNumber: line ?? callFrame.lineNumber,
          columnNumber: column ?? callFrame.columnNumber,
        },
      };
    }),
  };
  return { decoded, inputMisses };
}
