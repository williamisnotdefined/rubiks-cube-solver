#!/usr/bin/env node

import { cleanupAutopilotProcesses, readAutopilotProcesses } from "./processes.mjs";
import { parseArgs } from "../roadmap/lib.mjs";

const args = parseArgs(process.argv.slice(2));
const processes = await readAutopilotProcesses();

if (processes.length === 0) {
  console.log("No autopilot-owned processes are registered.");
  process.exit(0);
}

console.log(`Cleaning ${processes.length} autopilot-owned process record(s).`);
const results = await cleanupAutopilotProcesses({ force: Boolean(args.force) });

for (const result of results) {
  console.log(`${result.status}: pid=${result.pid} role=${result.role}${result.signal ? ` signal=${result.signal}` : ""}`);
}
