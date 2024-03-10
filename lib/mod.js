// @ts-check
import { SourceMapConsumer } from "source-map";

/**
 *
 * @param {import("./types").CpuProfile} profilejson
 * @returns {string[]}
 */
export function findSourcesInProfile(profilejson) {
  const set = new Set();
  for (const {
    callFrame: { url },
  } of profilejson.nodes) {
    set.add(url);
  }
  return [...set.values()];
}

/**
 *
 * @param {import("./types").CpuProfile} profilejson
 * @param {Record<string, import("source-map").RawSourceMap>} sourcemapjsons
 * @returns {Promise<import("./types").CpuProfile>}
 */
export async function decodeCpuProfile(profilejson, sourcemapjsons) {
  /** @type {Record<string, import("source-map").SourceMapConsumer>} */
  let consumers = {};
  for (const [url, sourcemapjson] of Object.entries(sourcemapjsons)) {
    consumers[url] = await new SourceMapConsumer(sourcemapjson, url);
  }
  return {
    ...profilejson,
    nodes: profilejson.nodes.map((node) => {
      const callFrame = node.callFrame;
      const consumer = consumers[callFrame.url];
      if (!consumer) {
        return node;
      }
      if (callFrame.lineNumber < 1 || callFrame.columnNumber < 1) return node;
      const { source, line, column, name } = consumer.originalPositionFor({
        line: callFrame.lineNumber,
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
}
