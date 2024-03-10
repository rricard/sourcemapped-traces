// @ts-check
import { SourceMapConsumer } from "source-map";
/**
 * @param {Record<string, import("source-map").RawSourceMap>} sourceMapJsons
 */
async function createConsumers(sourceMapJsons) {
  /** @type {Record<string, import("source-map").SourceMapConsumer>} */
  let consumers = {};
  for (const [url, sourceMapJson] of Object.entries(sourceMapJsons)) {
    consumers[url] = await new SourceMapConsumer(sourceMapJson, url);
  }
  return consumers;
}

/**
 * @param {import("./types").ProfileCallFrame} callFrame
 * @param {Record<string, SourceMapConsumer>} consumers
 * @returns {{ ok: import("./types").ProfileCallFrame } | { miss: string } | { negativeLineNumber: true }}
 */
function decodeCallFrame(callFrame, consumers) {
  const consumer = consumers[callFrame.url];
  if (!consumer) return { miss: callFrame.url };

  if (callFrame.lineNumber < 0) return { negativeLineNumber: true };
  const { source, line, column, name } = consumer.originalPositionFor({
    line: callFrame.lineNumber + 1,
    column: callFrame.columnNumber,
  });
  return {
    ok: {
      ...callFrame,
      functionName: name ?? callFrame.functionName,
      url: source ?? callFrame.url,
      lineNumber: line ?? callFrame.lineNumber,
      columnNumber: column ?? callFrame.columnNumber,
    },
  };
}

/**
 * Decodes sourcemapped locations in JSON CPU Profile data.
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
  const consumers = await createConsumers(sourceMapJsons);
  const inputMisses = new Set();
  /** @type {import("./types").CpuProfile} node */
  const decoded = {
    ...profileJson,
    nodes: profileJson.nodes.map((node) => {
      const result = decodeCallFrame(node.callFrame, consumers);
      if ("miss" in result) {
        inputMisses.add(result.miss);
        return node;
      } else if ("negativeLineNumber" in result) {
        return node;
      }
      return { ...node, callFrame: result.ok };
    }),
  };
  return { decoded, inputMisses };
}

/**
 * Decodes sourcemapped locations in JSON Heap Profile data.
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
 * @param {import("./types").HeapProfile} profileJson The profile JSON data to decode
 * @param {Record<string, import("source-map").RawSourceMap>} sourceMapJsons
 * A map of file uris to source map JSON data
 * @returns {Promise<{ decoded: import("./types").HeapProfile, inputMisses: Set<string> }>}
 * A promise of the decoded profile with the set of input file uri misses during that decoding
 */
export async function decodeHeapProfile(profileJson, sourceMapJsons) {
  const consumers = await createConsumers(sourceMapJsons);
  const inputMisses = new Set();
  /**
   * @param {import("./types").HeapNode} node
   * @returns {import("./types").HeapNode}
   */
  function decodeNode(node) {
    const result = decodeCallFrame(node.callFrame, consumers);
    let callFrame = node.callFrame;
    if ("miss" in result) {
      inputMisses.add(result.miss);
    } else if ("ok" in result) {
      callFrame = result.ok;
    }
    return {
      ...node,
      callFrame,
      children: node.children.map((node) => decodeNode(node)),
    };
  }
  /** @type {import("./types").HeapProfile} node */
  const decoded = { ...profileJson, head: decodeNode(profileJson.head) };
  return {
    decoded,
    inputMisses,
  };
}
