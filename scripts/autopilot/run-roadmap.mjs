#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  findNextRunnableStep,
  fixedModel,
  fixedVariant,
  formatStep,
  markStepBlocked,
  markStepDone,
  parseArgs,
  pathExists,
  readExecution,
  rootDir,
  validateExecution,
  writeExecution,
} from "../roadmap/lib.mjs";

const defaultVerification = [
  'if [ -f "$HOME/.cargo/env" ]; then . "$HOME/.cargo/env"; fi; cargo fmt --check',
  'if [ -f "$HOME/.cargo/env" ]; then . "$HOME/.cargo/env"; fi; cargo test',
  'if [ -f "$HOME/.cargo/env" ]; then . "$HOME/.cargo/env"; fi; cargo clippy --all-targets --all-features -- -D warnings',
  "npm run lint",
  "npm run roadmap:check",
];

const args = parseArgs(process.argv.slice(2));

if (args.model !== undefined && args.model !== fixedModel) {
  throw new Error(`Roadmap autopilot is fixed to ${fixedModel}; remove --model or use ${fixedModel}.`);
}

if (args.variant !== undefined && args.variant !== fixedVariant) {
  throw new Error(`Roadmap autopilot is fixed to variant ${fixedVariant}; remove --variant or use ${fixedVariant}.`);
}

const options = {
  agent: String(args.agent ?? "build"),
  branch: String(args.branch ?? "autopilot/roadmap"),
  dryRun: Boolean(args["dry-run"]),
  interactivePermissions: Boolean(args["interactive-permissions"]),
  maxAttempts: numberOption(args["max-attempts"], 3),
  maxHours: numberOption(args["max-hours"], 72),
  maxSteps: numberOption(args["max-steps"], 1),
  model: fixedModel,
  noReconcile: Boolean(args["no-reconcile"]),
  noPush: Boolean(args["no-push"]),
  variant: fixedVariant,
};

const startTime = Date.now();

if (!(await pathExists(path.join(rootDir, "ai/roadmap/execution.json")))) {
  throw new Error("Missing ai/roadmap/execution.json.");
}

await main();

async function main() {
  if (options.dryRun) {
    const execution = await loadValidExecution();
    const step = findNextRunnableStep(execution);

    if (step) {
      console.log(`Next roadmap step:\n${formatStep(step)}`);
    } else {
      console.log("No runnable pending roadmap step found.");
    }

    console.log(`Dry run: would use model ${options.model} with variant ${options.variant}.`);
    console.log(`Dry run: roadmap reconciler is ${options.noReconcile ? "disabled" : "enabled"}.`);
    return;
  }

  await ensureCleanWorktree();

  if (options.branch !== "current") {
    await ensureBranch(options.branch);
  }

  let completedSteps = 0;

  while (completedSteps < options.maxSteps && !timeLimitReached()) {
    const execution = await loadValidExecution();
    const step = findNextRunnableStep(execution);

    if (!step) {
      console.log("No runnable pending roadmap step found.");
      return;
    }

    console.log(`Next roadmap step:\n${formatStep(step)}`);

    await runStep(step, execution);
    completedSteps += 1;
  }

  if (timeLimitReached()) {
    console.log(`Stopped after reaching max-hours=${options.maxHours}.`);
  }
}

async function runStep(step, execution) {
  const logDir = await createLogDir(step.id);
  let lastFailure = "";

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const promptPath = path.join(logDir, `attempt-${attempt}.prompt.md`);
    const prompt = await renderPrompt(attempt === 1 ? "implement-step.md" : "fix-failure.md", {
      ATTEMPT: `${attempt}`,
      LAST_FAILURE: lastFailure.slice(-16_000),
      ROADMAP_STATUS: formatStep(step),
      STEP_JSON: JSON.stringify(step, null, 2),
    });

    await writeFile(promptPath, prompt);

    const agentResult = await runOpencode(prompt, promptPath, path.join(logDir, `attempt-${attempt}.opencode.log`));
    if (agentResult.code !== 0) {
      lastFailure = `opencode exited with ${agentResult.code}\n${agentResult.output}`;
      await writeFile(path.join(logDir, `attempt-${attempt}.failure.log`), lastFailure);
      continue;
    }

    const verification = await runVerification(step, logDir, attempt);
    if (verification.ok) {
      await completeStep(step, execution, logDir);
      if (!options.noReconcile) {
        await reconcileRoadmap(step, logDir);
      }
      return;
    }

    lastFailure = verification.output;
    await writeFile(path.join(logDir, `attempt-${attempt}.failure.log`), lastFailure);
  }

  markStepBlocked(execution, step.id, `Autopilot failed after ${options.maxAttempts} attempts. See ${path.relative(rootDir, logDir)}.`);
  await writeExecution(execution);
  throw new Error(`Roadmap step ${step.id} failed after ${options.maxAttempts} attempts. Logs: ${logDir}`);
}

async function completeStep(step, execution, logDir) {
  markStepDone(execution, step.id);
  await writeExecution(execution);
  await runRequiredShell("npm run roadmap:check", path.join(logDir, "roadmap-check-after-done.log"));

  const status = await runGit(["status", "--short"], path.join(logDir, "git-status-before-commit.log"));
  if (status.output.trim() === "") {
    throw new Error(`Step ${step.id} passed verification but produced no commitable changes.`);
  }

  await runGit(["add", "."], path.join(logDir, "git-add.log"));
  await runGit(["diff", "--cached", "--check"], path.join(logDir, "git-diff-check.log"));
  await runGit(["commit", "-m", step.commitMessage], path.join(logDir, "git-commit.log"));

  if (!options.noPush) {
    await pushCurrentBranch(logDir);
  }

  console.log(`Completed roadmap step ${step.id}. Logs: ${path.relative(rootDir, logDir)}`);
}

async function reconcileRoadmap(completedStep, stepLogDir) {
  const reconcileLogDir = path.join(stepLogDir, "reconcile");
  const execution = await loadValidExecution();
  const promptPath = path.join(reconcileLogDir, "reconcile.prompt.md");
  const prompt = await renderPrompt("reconcile-roadmap.md", {
    COMPLETED_STEP_JSON: JSON.stringify(completedStep, null, 2),
    EXECUTION_JSON: JSON.stringify(execution, null, 2),
    ROADMAP_STATUS: formatStep(findNextRunnableStep(execution)),
  });

  await mkdir(reconcileLogDir, { recursive: true });
  await writeFile(promptPath, prompt);

  const reconcileResult = await runOpencode(prompt, promptPath, path.join(reconcileLogDir, "opencode.log"));
  if (reconcileResult.code !== 0) {
    throw new Error(`Roadmap reconciliation failed. See ${path.relative(rootDir, reconcileLogDir)}.`);
  }

  await runRequiredShell("npm run roadmap:check", path.join(reconcileLogDir, "roadmap-check.log"));
  await runRequiredShell("npm run lint", path.join(reconcileLogDir, "lint.log"));

  const changedFiles = await changedWorktreeFiles(reconcileLogDir);
  if (changedFiles.length === 0) {
    console.log("Roadmap reconciliation produced no queue changes.");
    return;
  }

  const allowedFiles = new Set(["ai/roadmap/execution.json"]);
  const disallowedFiles = changedFiles.filter((file) => !allowedFiles.has(file));
  if (disallowedFiles.length > 0) {
    throw new Error(`Roadmap reconciliation may only edit ai/roadmap/execution.json. Unexpected files: ${disallowedFiles.join(", ")}.`);
  }

  await runGit(["add", "ai/roadmap/execution.json"], path.join(reconcileLogDir, "git-add.log"));
  await runGit(["diff", "--cached", "--check"], path.join(reconcileLogDir, "git-diff-check.log"));
  await runGit(["commit", "-m", "Reconcile roadmap execution queue"], path.join(reconcileLogDir, "git-commit.log"));

  if (!options.noPush) {
    await pushCurrentBranch(reconcileLogDir);
  }
}

async function runVerification(step, logDir, attempt) {
  const commands = step.verification?.length > 0 ? step.verification : defaultVerification;
  let output = "";

  for (const [index, command] of commands.entries()) {
    const logPath = path.join(logDir, `attempt-${attempt}.verify-${index + 1}.log`);
    const result = await runShell(command, logPath);
    output += `$ ${command}\n${result.output}\n`;

    if (result.code !== 0) {
      return { ok: false, output };
    }
  }

  return { ok: true, output };
}

async function runOpencode(prompt, promptPath, logPath) {
  const opencodeArgs = ["run", "--model", options.model, "--variant", options.variant, "--agent", options.agent];

  if (!options.interactivePermissions) {
    opencodeArgs.push("--dangerously-skip-permissions");
  }

  opencodeArgs.push(prompt);

  console.log(`Running opencode for ${path.basename(promptPath)} with ${options.model}/${options.variant}.`);
  return runCommand("opencode", opencodeArgs, logPath, {
    AUTOPILOT_PROMPT_FILE: promptPath,
    OPENCODE_MODEL: options.model,
    OPENCODE_VARIANT: options.variant,
  });
}

async function runShell(command, logPath) {
  console.log(`$ ${command}`);
  return runCommand(command, [], logPath, {}, true);
}

async function runRequiredShell(command, logPath) {
  const result = await runShell(command, logPath);
  if (result.code !== 0) {
    throw new Error(`Command failed: ${command}. See ${path.relative(rootDir, logPath)}.`);
  }

  return result;
}

async function runGit(gitArgs, logPath) {
  return runCommand("git", gitArgs, logPath);
}

async function changedWorktreeFiles(logDir) {
  const tracked = await runGit(["diff", "--name-only"], path.join(logDir, "git-diff-name-only.log"));
  const untracked = await runGit(["ls-files", "--others", "--exclude-standard"], path.join(logDir, "git-untracked.log"));

  return [...tracked.output.split("\n"), ...untracked.output.split("\n")]
    .map((file) => file.trim())
    .filter(Boolean)
    .toSorted();
}

async function runCommand(command, commandArgs, logPath, extraEnv = {}, shell = false) {
  await mkdir(path.dirname(logPath), { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: { ...process.env, ...extraEnv },
      shell,
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("close", async (code) => {
      await writeFile(logPath, output);
      resolve({ code, output });
    });
  });
}

async function loadValidExecution() {
  const execution = await readExecution();
  const errors = validateExecution(execution);
  if (errors.length > 0) {
    throw new Error(`Roadmap execution is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return execution;
}

async function renderPrompt(templateName, values) {
  const template = await readFile(path.join(rootDir, "scripts/autopilot/prompts", templateName), "utf8");
  return Object.entries(values).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    template,
  );
}

async function createLogDir(stepId) {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const logDir = path.join(rootDir, ".autopilot/logs", `${timestamp}-${stepId}`);
  await mkdir(logDir, { recursive: true });
  return logDir;
}

async function ensureCleanWorktree() {
  const result = await runGit(["status", "--short"], path.join(rootDir, ".autopilot/preflight-git-status.log"));
  if (result.code !== 0) {
    throw new Error("git status failed during autopilot preflight.");
  }

  if (result.output.trim() !== "") {
    throw new Error("Autopilot requires a clean worktree before starting.");
  }
}

async function ensureBranch(branchName) {
  const current = await runGit(["branch", "--show-current"], path.join(rootDir, ".autopilot/current-branch.log"));
  if (current.output.trim() === branchName) {
    return;
  }

  const exists = await runGit(["rev-parse", "--verify", branchName], path.join(rootDir, ".autopilot/branch-exists.log"));
  if (exists.code === 0) {
    await runGit(["switch", branchName], path.join(rootDir, ".autopilot/git-switch.log"));
  } else {
    await runGit(["switch", "-c", branchName], path.join(rootDir, ".autopilot/git-switch-create.log"));
  }
}

async function pushCurrentBranch(logDir) {
  const branch = (await runGit(["branch", "--show-current"], path.join(logDir, "git-current-branch.log"))).output.trim();
  const upstream = await runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], path.join(logDir, "git-upstream.log"));

  if (upstream.code === 0) {
    await runGit(["push"], path.join(logDir, "git-push.log"));
  } else {
    await runGit(["push", "-u", "origin", branch], path.join(logDir, "git-push-set-upstream.log"));
  }
}

function numberOption(value, defaultValue) {
  if (value === undefined || value === true) {
    return defaultValue;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Expected a positive number, got ${value}.`);
  }

  return number;
}

function timeLimitReached() {
  return Date.now() - startTime > options.maxHours * 60 * 60 * 1000;
}
