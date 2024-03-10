import { Session } from "node:inspector/promises";
import fs from "node:fs";

function getFibIndices(n) {
  return [n - 1, n - 2];
}

function fib(n) {
  if (n <= 1) return 1;
  if (n % 19 === 0) {
    // oops, shouldn't have left this here
    new ArrayBuffer(1024 * 1024 * 1024);
  }
  function map(i) {
    return fib(i);
  }
  function reduce(acc, v) {
    return acc + v;
  }
  // we got extra fancy here, was that wise?
  return getFibIndices(n).map(map).reduce(reduce, 0);
}

// Docs: https://nodejs.org/api/inspector.html & https://chromedevtools.github.io/devtools-protocol/v8/
const session = new Session();
session.connect();

await session.post("Profiler.enable");
await session.post("Profiler.start");

console.log("fib", fib(40));

const { profile: cpuProfile } = await session.post("Profiler.stop");
fs.writeFileSync("./profile.cpuprofile", JSON.stringify(cpuProfile));

await session.post("HeapProfiler.enable");
await session.post("HeapProfiler.startSampling");

console.log("fib", fib(40));

const { profile: heapProfile } = await session.post(
  "HeapProfiler.stopSampling"
);
fs.writeFileSync("./profile.heapprofile", JSON.stringify(heapProfile));
