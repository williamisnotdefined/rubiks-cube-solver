#!/usr/bin/env node

import { findNextRunnableStep, formatStep, readQueueFile, summarizeQueueFile, validateGoalsFile, validateQueueFile } from "./lib.mjs";

const queueFile = await readQueueFile();
const errors = [...(await validateGoalsFile()), ...validateQueueFile(queueFile)];

if (errors.length > 0) {
  console.error(`Roadmap queue file is invalid. Run npm run roadmap:check for details.`);
  process.exit(1);
}

const summary = summarizeQueueFile(queueFile);
console.log("Roadmap status:");
for (const [status, count] of Object.entries(summary)) {
  console.log(`- ${status}: ${count}`);
}

const nextStep = findNextRunnableStep(queueFile);
if (nextStep) {
  console.log(`\nNext runnable step:\n${formatStep(nextStep)}`);
} else {
  console.log("\nNo runnable pending step found.");
}
