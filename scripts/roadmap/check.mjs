#!/usr/bin/env node

import { readQueueFile, summarizeQueueFile, validateGoalsFile, validateQueueFile } from "./lib.mjs";

const queueFile = await readQueueFile();
const errors = [...(await validateGoalsFile()), ...validateQueueFile(queueFile)];

if (errors.length > 0) {
  console.error(`Roadmap queue file is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

const summary = summarizeQueueFile(queueFile);
const total = queueFile.queue.length + queueFile.history.length + queueFile.blocked.length;
console.log(
  `Roadmap queue file is valid: ${total} records (${Object.entries(summary)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ")}).`,
);
