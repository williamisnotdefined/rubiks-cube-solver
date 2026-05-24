import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const executionPath = path.join(rootDir, "ai/roadmap/execution.json");
export const validStatuses = new Set(["pending", "in_progress", "done", "blocked", "skipped"]);

export async function readExecution() {
  return JSON.parse(await readFile(executionPath, "utf8"));
}

export async function writeExecution(execution) {
  await mkdir(path.dirname(executionPath), { recursive: true });
  await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);
}

export function validateExecution(execution) {
  const errors = [];

  if (execution?.version !== 1) {
    errors.push("execution.version must be 1.");
  }

  if (typeof execution?.source !== "string" || execution.source.length === 0) {
    errors.push("execution.source must be a non-empty string.");
  }

  if (!Array.isArray(execution?.steps) || execution.steps.length === 0) {
    errors.push("execution.steps must be a non-empty array.");
    return errors;
  }

  const seenIds = new Set();
  for (const [index, step] of execution.steps.entries()) {
    const prefix = `steps[${index}]`;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step?.id ?? "")) {
      errors.push(`${prefix}.id must be lowercase kebab-case.`);
    }

    if (seenIds.has(step.id)) {
      errors.push(`${prefix}.id is duplicated: ${step.id}.`);
    }
    seenIds.add(step.id);

    requireString(step.phase, `${prefix}.phase`, errors);
    requireString(step.title, `${prefix}.title`, errors);
    requireString(step.prompt, `${prefix}.prompt`, errors);
    requireString(step.commitMessage, `${prefix}.commitMessage`, errors);

    if (!validStatuses.has(step.status)) {
      errors.push(`${prefix}.status must be one of ${[...validStatuses].join(", ")}.`);
    }

    requireStringArray(step.scope, `${prefix}.scope`, errors);
    requireStringArray(step.acceptance, `${prefix}.acceptance`, errors);
    requireStringArray(step.verification, `${prefix}.verification`, errors);

    if (step.dependsOn !== undefined) {
      requireStringArray(step.dependsOn, `${prefix}.dependsOn`, errors);
    }
  }

  for (const step of execution.steps) {
    for (const dependency of step.dependsOn ?? []) {
      if (!seenIds.has(dependency)) {
        errors.push(`${step.id}.dependsOn references unknown step ${dependency}.`);
      }

      if (dependency === step.id) {
        errors.push(`${step.id}.dependsOn must not reference itself.`);
      }
    }
  }

  errors.push(...detectDependencyCycles(execution.steps));

  return errors;
}

export function summarizeExecution(execution) {
  const counts = Object.fromEntries([...validStatuses].map((status) => [status, 0]));

  for (const step of execution.steps) {
    counts[step.status] = (counts[step.status] ?? 0) + 1;
  }

  return counts;
}

export function findNextRunnableStep(execution) {
  const stepsById = new Map(execution.steps.map((step) => [step.id, step]));

  return execution.steps.find((step) => {
    if (step.status !== "pending") {
      return false;
    }

    return (step.dependsOn ?? []).every((dependency) => stepsById.get(dependency)?.status === "done");
  });
}

export function formatStep(step) {
  return [
    `${step.id} - ${step.title}`,
    `Phase: ${step.phase}`,
    `Status: ${step.status}`,
    `Scope: ${step.scope.join(", ")}`,
    `Acceptance: ${step.acceptance.join("; ")}`,
    `Commit: ${step.commitMessage}`,
  ].join("\n");
}

export function markStepDone(execution, stepId) {
  const step = execution.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new Error(`Unknown roadmap step: ${stepId}`);
  }

  step.status = "done";
  step.completedAt = new Date().toISOString();
  step.updatedAt = step.completedAt;
  execution.updatedAt = step.completedAt;
}

export function markStepBlocked(execution, stepId, reason) {
  const step = execution.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new Error(`Unknown roadmap step: ${stepId}`);
  }

  step.status = "blocked";
  step.blockedAt = new Date().toISOString();
  step.blockedReason = reason;
  step.updatedAt = step.blockedAt;
  execution.updatedAt = step.blockedAt;
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

function detectDependencyCycles(steps) {
  const errors = [];
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const visiting = new Set();
  const visited = new Set();

  function visit(stepId, path) {
    if (visiting.has(stepId)) {
      errors.push(`Dependency cycle detected: ${[...path, stepId].join(" -> ")}.`);
      return;
    }

    if (visited.has(stepId)) {
      return;
    }

    visiting.add(stepId);
    for (const dependency of stepsById.get(stepId)?.dependsOn ?? []) {
      if (stepsById.has(dependency)) {
        visit(dependency, [...path, stepId]);
      }
    }
    visiting.delete(stepId);
    visited.add(stepId);
  }

  for (const step of steps) {
    visit(step.id, []);
  }

  return errors;
}
