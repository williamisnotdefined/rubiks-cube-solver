import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { pathExists, rootDir } from "../roadmap/lib.mjs";

export const processRegistryPath = path.join(rootDir, ".autopilot/processes.json");

export async function readAutopilotProcesses() {
  if (!(await pathExists(processRegistryPath))) {
    return [];
  }

  try {
    const parsed = JSON.parse(await readFile(processRegistryPath, "utf8"));
    return Array.isArray(parsed.processes) ? parsed.processes : [];
  } catch {
    return [];
  }
}

export async function registerAutopilotProcess({ command, cwd, pid, role }) {
  const processInfo = await readProcessInfo(pid);
  if (!processInfo) {
    throw new Error(`Cannot register autopilot process ${pid}: process info unavailable.`);
  }

  const processes = (await readAutopilotProcesses()).filter((process) => process.pid !== pid);
  processes.push({
    command,
    cwd,
    pid,
    processGroupId: pid,
    role,
    startTimeTicks: processInfo.startTimeTicks,
    startedAt: new Date().toISOString(),
  });
  await writeAutopilotProcesses(processes);
}

export async function unregisterAutopilotProcess(pid) {
  const processes = (await readAutopilotProcesses()).filter((process) => process.pid !== pid);
  await writeAutopilotProcesses(processes);
}

export async function cleanupAutopilotProcesses({ force = false, signal = "SIGTERM" } = {}) {
  const processes = await readAutopilotProcesses();
  const results = [];
  const survivors = [];

  for (const processRecord of processes) {
    const sameProcess = await isSameProcess(processRecord);

    if (!sameProcess) {
      results.push({ pid: processRecord.pid, role: processRecord.role, status: "stale" });
      continue;
    }

    const killed = killProcessGroup(processRecord.processGroupId ?? processRecord.pid, signal);
    results.push({
      pid: processRecord.pid,
      role: processRecord.role,
      signal,
      status: killed ? "signaled" : "missing",
    });

    if (killed) {
      await sleep(1000);
    }

    if (killed && force) {
      if (await isSameProcess(processRecord)) {
        const forceKilled = killProcessGroup(processRecord.processGroupId ?? processRecord.pid, "SIGKILL");
        results.push({
          pid: processRecord.pid,
          role: processRecord.role,
          signal: "SIGKILL",
          status: forceKilled ? "signaled" : "missing",
        });
      }
    }

    if (await isSameProcess(processRecord)) {
      survivors.push(processRecord);
    }
  }

  await writeAutopilotProcesses(survivors);
  return results;
}

async function writeAutopilotProcesses(processes) {
  await mkdir(path.dirname(processRegistryPath), { recursive: true });

  if (processes.length === 0) {
    await rm(processRegistryPath, { force: true });
    return;
  }

  await writeFile(processRegistryPath, `${JSON.stringify({ processes }, null, 2)}\n`);
}

async function isSameProcess(processRecord) {
  const processInfo = await readProcessInfo(processRecord.pid);
  return processInfo?.startTimeTicks === processRecord.startTimeTicks;
}

async function readProcessInfo(pid) {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");
    const commandLine = await readFile(`/proc/${pid}/cmdline`, "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
    const startTimeTicks = fields[19];

    return {
      command: commandLine.replaceAll("\0", " ").trim(),
      startTimeTicks,
    };
  } catch {
    return null;
  }
}

function killProcessGroup(processGroupId, signal) {
  try {
    process.kill(-processGroupId, signal);
    return true;
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }

  try {
    process.kill(processGroupId, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") {
      return false;
    }

    throw error;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
