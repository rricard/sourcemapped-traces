import { Session } from "node:inspector/promises";
import fs from "node:fs";

const session = new Session();
session.connect();

await session.post("Profiler.enable");
await session.post("Profiler.start");

function fib(n: number) {
  if (n <= 1) return 1;
  return fib(n - 2) + fib(n - 1);
}

console.log("fib", fib(45));

const { profile } = await session.post("Profiler.stop");
fs.writeFileSync("./profile.cpuprofile", JSON.stringify(profile));
