#!/usr/bin/env node

import { findNextRunnableStep, formatStep, parseArgs, readQueueFile, validateGoalsFile, validateQueueFile } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const queueFile = await readQueueFile();
const errors = [...(await validateGoalsFile()), ...validateQueueFile(queueFile)];

if (errors.length > 0) {
  console.error(`Roadmap queue file is invalid. Run npm run roadmap:check for details.`);
  process.exit(1);
}

const nextStep = findNextRunnableStep(queueFile);
if (!nextStep) {
  console.log("No runnable pending step found.");
  process.exit(0);
}

if (args.json) {
  console.log(JSON.stringify(nextStep, null, 2));
} else {
  console.log(formatStep(nextStep));
}
