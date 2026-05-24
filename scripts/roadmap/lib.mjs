import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const executionPath = path.join(rootDir, "ai/roadmap/execution.json");
export const goalsPath = path.join(rootDir, "GOALS.md");
export const fixedModel = "openai/gpt-5.5";
export const fixedVariant = "xhigh";

export async function readExecution() {
  return JSON.parse(await readFile(executionPath, "utf8"));
}

export async function writeExecution(execution) {
  await mkdir(path.dirname(executionPath), { recursive: true });
  await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);
}

export function validateExecution(execution) {
  const errors = [];

  if (execution?.version !== 2) {
    errors.push("execution.version must be 2.");
  }

  if (execution?.model !== fixedModel) {
    errors.push(`execution.model must be ${fixedModel}.`);
  }

  if (execution?.variant !== fixedVariant) {
    errors.push(`execution.variant must be ${fixedVariant}.`);
  }

  if (typeof execution?.source !== "string" || execution.source.length === 0) {
    errors.push("execution.source must be a non-empty string.");
  }

  if (execution?.goals !== "GOALS.md") {
    errors.push("execution.goals must be GOALS.md.");
  }

  for (const collection of ["queue", "history", "blocked"]) {
    if (!Array.isArray(execution?.[collection])) {
      errors.push(`execution.${collection} must be an array.`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const seenIds = new Map();
  validateQueue(execution.queue, seenIds, errors);
  validateRecords(execution.history, "history", seenIds, errors);
  validateRecords(execution.blocked, "blocked", seenIds, errors);

  if (execution.blocked.some((record) => typeof record.blockedReason !== "string" || record.blockedReason.length === 0)) {
    errors.push("blocked records must include blockedReason.");
  }

  if (execution.history.some((record) => typeof record.completedAt !== "string" || record.completedAt.length === 0)) {
    errors.push("history records must include completedAt.");
  }

  return errors;
}

export function summarizeExecution(execution) {
  return {
    queued: execution.queue.length,
    done: execution.history.length,
    blocked: execution.blocked.length,
  };
}

export function findNextRunnableStep(execution) {
  return execution.queue[0] ?? null;
}

export function formatStep(step) {
  if (!step) {
    return "No roadmap step.";
  }

  return [
    `${step.id} - ${step.title}`,
    `Phase: ${step.phase}`,
    `Scope: ${step.scope.join(", ")}`,
    `Acceptance: ${step.acceptance.join("; ")}`,
    `Commit: ${step.commitMessage}`,
  ].join("\n");
}

export function markStepDone(execution, stepId) {
  const step = execution.queue[0];
  if (!step || step.id !== stepId) {
    throw new Error(`Can only mark queue[0] as done. Expected ${step?.id ?? "none"}, got ${stepId}.`);
  }

  const completedAt = new Date().toISOString();
  const [completed] = execution.queue.splice(0, 1);
  execution.history.push({
    ...completed,
    completedAt,
  });
  execution.updatedAt = completedAt;
}

export function markStepBlocked(execution, stepId, reason) {
  const step = execution.queue[0];
  if (!step || step.id !== stepId) {
    throw new Error(`Can only block queue[0]. Expected ${step?.id ?? "none"}, got ${stepId}.`);
  }

  const blockedAt = new Date().toISOString();
  const [blocked] = execution.queue.splice(0, 1);
  execution.blocked.push({
    ...blocked,
    blockedAt,
    blockedReason: reason,
  });
  execution.updatedAt = blockedAt;
}

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      args._ = [...(args._ ?? []), value];
      continue;
    }

    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
      continue;
    }

    args[key] = true;
  }

  return args;
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function validateGoalsFile() {
  const errors = [];

  if (!(await pathExists(goalsPath))) {
    return ["GOALS.md must exist at repository root."];
  }

  const content = await readFile(goalsPath, "utf8");
  for (const requiredText of [
    "web interface",
    "valid 3x3 Rubik's Cube state",
    "valid solution",
    "20 moves",
    "Playwright",
  ]) {
    if (!content.includes(requiredText)) {
      errors.push(`GOALS.md must mention ${requiredText}.`);
    }
  }

  return errors;
}

function validateQueue(queue, seenIds, errors) {
  for (const [index, step] of queue.entries()) {
    validateStep(step, `queue[${index}]`, seenIds, errors);

    if (step.status !== undefined) {
      errors.push(`queue[${index}].status is not allowed; queue order is the status.`);
    }

    if (step.dependsOn !== undefined) {
      errors.push(`queue[${index}].dependsOn is not allowed; queue order is the dependency model.`);
    }
  }
}

function validateRecords(records, collection, seenIds, errors) {
  for (const [index, record] of records.entries()) {
    validateStep(record, `${collection}[${index}]`, seenIds, errors);
  }
}

function validateStep(step, prefix, seenIds, errors) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step?.id ?? "")) {
    errors.push(`${prefix}.id must be lowercase kebab-case.`);
  }

  if (seenIds.has(step?.id)) {
    errors.push(`${prefix}.id duplicates ${seenIds.get(step.id)}: ${step.id}.`);
  } else if (step?.id) {
    seenIds.set(step.id, prefix);
  }

  requireString(step?.phase, `${prefix}.phase`, errors);
  requireString(step?.title, `${prefix}.title`, errors);
  requireString(step?.prompt, `${prefix}.prompt`, errors);
  requireString(step?.commitMessage, `${prefix}.commitMessage`, errors);
  requireStringArray(step?.scope, `${prefix}.scope`, errors);
  requireStringArray(step?.acceptance, `${prefix}.acceptance`, errors);
  requireStringArray(step?.verification, `${prefix}.verification`, errors);
  validateVerification(step?.verification ?? [], `${prefix}.verification`, errors);
}

function validateVerification(commands, field, errors) {
  const joined = commands.join("\n");

  if (!joined.includes("cargo test")) {
    errors.push(`${field} must include cargo test.`);
  }

  if (!joined.includes("npm run lint")) {
    errors.push(`${field} must include npm run lint.`);
  }

  if (!joined.includes("npm run roadmap:check")) {
    errors.push(`${field} must include npm run roadmap:check.`);
  }
}

function requireString(value, field, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${field} must be a non-empty string.`);
  }
}

function requireStringArray(value, field, errors) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) {
    errors.push(`${field} must be a non-empty string array.`);
  }
}
