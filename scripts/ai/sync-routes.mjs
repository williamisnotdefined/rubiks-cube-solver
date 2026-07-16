#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = path.join(rootDir, "ai/registry.json");
const registrySchemaPath = "ai/registry.schema.json";
const checkOnly = process.argv.includes("--check");
const generatedNotice = "Generated from `ai/registry.json`. Do not edit manually.";
const supportedRegistryVersion = 2;
const compiledRouteWarningBytes = 35 * 1024;
const approvedReferenceRoots = ["ai/rules", "ai/architecture", "ai/glossary", "ai/examples"];
const toolNames = ["opencode", "cursor", "github", "codex"];

function yamlString(value) {
  return JSON.stringify(value);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/").replace(/\\/g, "/");
}

function isPathInside(relativePath, parentPath) {
  return relativePath === parentPath || relativePath.startsWith(`${parentPath}/`);
}

function isPathInsideAny(relativePath, parentPaths) {
  return parentPaths.some((parentPath) => isPathInside(relativePath, parentPath));
}

function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value;
}

function requiredObject(value, fieldName) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }

  return value;
}

function validateAllowedKeys(value, fieldName, allowedKeys) {
  for (const key of Object.keys(requiredObject(value, fieldName))) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`${fieldName}.${key} is not allowed by ${registrySchemaPath}.`);
    }
  }
}

function validateBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }
}

function requiredRelativePath(value, fieldName) {
  const relativePath = toPosixPath(requiredString(value, fieldName).trim());

  if (path.isAbsolute(relativePath) || relativePath.startsWith("/") || /^[a-zA-Z]:\//.test(relativePath)) {
    throw new Error(`${fieldName} must be a relative path.`);
  }

  if (relativePath.split("/").includes("..")) {
    throw new Error(`${fieldName} must not contain '..'.`);
  }

  return relativePath;
}

function referencesForSkill(skill) {
  if (skill.references === undefined) {
    return [];
  }

  if (!Array.isArray(skill.references)) {
    throw new Error(`${skill.name}.references must be an array when present.`);
  }

  return skill.references;
}

function normalizeMarkdown(content) {
  return `${content.trimEnd()}\n`;
}

function requiredSkillName(value, fieldName) {
  const skillName = requiredString(value, fieldName);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)) {
    throw new Error(`${fieldName} must use lowercase kebab-case.`);
  }

  return skillName;
}

function resolveRoutePath(registry, skill, toolName) {
  const explicitRoute = skill.routes?.[toolName];
  if (explicitRoute) {
    return requiredRelativePath(explicitRoute, `${skill.name}.routes.${toolName}`);
  }

  const routePattern = registry.tools?.[toolName]?.routePattern;
  return requiredString(routePattern, `tools.${toolName}.routePattern`).replace("{skill}", skill.name);
}

function routePatternRoot(registry, toolName) {
  const routePattern = requiredRelativePath(
    registry.tools?.[toolName]?.routePattern,
    `tools.${toolName}.routePattern`,
  );
  const markerIndex = routePattern.indexOf("{skill}");

  if (markerIndex === -1) {
    throw new Error(`tools.${toolName}.routePattern must contain {skill}.`);
  }

  const prefix = routePattern.slice(0, markerIndex);
  if (prefix.endsWith("/")) {
    return prefix.slice(0, -1) || ".";
  }

  return path.dirname(prefix);
}

function relativeContextPath(routePath, contextPath) {
  const routeDirectory = path.dirname(path.join(rootDir, routePath));
  const contextFile = path.join(rootDir, contextPath);
  let relativePath = toPosixPath(path.relative(routeDirectory, contextFile));

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function referenceList(routePath, references) {
  if (references.length === 0) {
    return "- None";
  }

  return references
    .map(({ referencePath }) => `- \`${relativeContextPath(routePath, referencePath)}\``)
    .join("\n");
}

function referenceSections(references) {
  if (references.length === 0) {
    return "";
  }

  return `\n# Referenced Context\n\n${references
    .map(
      ({ content, referencePath }) =>
        `## Reference: \`${referencePath}\`\n\n${normalizeMarkdown(content)}`,
    )
    .join("\n")}`;
}

function routeBody(routePath, skill, context) {
  const canonicalRelativePath = relativeContextPath(routePath, skill.canonicalPath);

  return `${generatedNotice}\n\nCanonical skill: \`${canonicalRelativePath}\`.\n\nReferenced context:\n${referenceList(routePath, context.references)}\n\nThis file is compiled from canonical AI knowledge files. Edit canonical files under \`ai\`, then run \`npm run ai:sync\`.\n\n# Compiled AI Skill: ${skill.name}\n\n## Canonical Skill: \`${skill.canonicalPath}\`\n\n${normalizeMarkdown(context.canonicalContent)}${referenceSections(context.references)}`;
}

function opencodeRoute(skill, routePath, context) {
  return `---\nname: ${yamlString(skill.name)}\ndescription: ${yamlString(skill.description)}\n---\n\n${routeBody(routePath, skill, context)}`;
}

function codexRoute(skill, routePath, context) {
  return `---\nname: ${yamlString(skill.name)}\ndescription: ${yamlString(skill.description)}\n---\n\n${routeBody(routePath, skill, context)}`;
}

function cursorRoute(skill, routePath, context) {
  const cursorConfig = skill.toolConfig?.cursor ?? {};
  const alwaysApply = cursorConfig.alwaysApply === true;

  if (alwaysApply && skill.global !== true) {
    throw new Error(`${skill.name}: toolConfig.cursor.alwaysApply can be true only for global skills.`);
  }

  if (!alwaysApply && cursorConfig.alwaysApply !== false) {
    throw new Error(`${skill.name}: toolConfig.cursor.alwaysApply must be false unless skill.global is true.`);
  }

  return `---\ndescription: ${yamlString(skill.description)}\nglobs: ${yamlString(requiredString(cursorConfig.globs, `${skill.name}.toolConfig.cursor.globs`))}\nalwaysApply: ${alwaysApply ? "true" : "false"}\n---\n\n${routeBody(routePath, skill, context)}`;
}

function githubRoute(skill, routePath, context) {
  const githubConfig = skill.toolConfig?.github ?? {};

  return `---\napplyTo: ${yamlString(requiredString(githubConfig.applyTo, `${skill.name}.toolConfig.github.applyTo`))}\n---\n\n${routeBody(routePath, skill, context)}`;
}

function buildRoute(registry, skill, toolName, context) {
  const routePath = resolveRoutePath(registry, skill, toolName);

  if (toolName === "opencode") {
    return { content: opencodeRoute(skill, routePath, context), routePath };
  }

  if (toolName === "cursor") {
    return { content: cursorRoute(skill, routePath, context), routePath };
  }

  if (toolName === "github") {
    return { content: githubRoute(skill, routePath, context), routePath };
  }

  if (toolName === "codex") {
    return { content: codexRoute(skill, routePath, context), routePath };
  }

  throw new Error(`Unsupported tool: ${toolName}`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileSha256(relativePath) {
  const content = await readFile(path.join(rootDir, relativePath));
  return createHash("sha256").update(content).digest("hex");
}

function validateRegistrySchemaShape(registry) {
  validateAllowedKeys(registry, "registry", ["$schema", "version", "canonicalRoot", "tools", "skills"]);

  if (registry.$schema !== undefined) {
    requiredString(registry.$schema, "registry.$schema");
  }

  validateAllowedKeys(registry.tools, "registry.tools", toolNames);

  for (const toolName of toolNames) {
    validateAllowedKeys(registry.tools?.[toolName], `registry.tools.${toolName}`, ["routePattern"]);
    requiredString(registry.tools?.[toolName]?.routePattern, `registry.tools.${toolName}.routePattern`);
  }

  for (const [skillIndex, skill] of registry.skills.entries()) {
    const skillField = `registry.skills[${skillIndex}]`;
    validateAllowedKeys(skill, skillField, [
      "name",
      "description",
      "global",
      "canonicalPath",
      "references",
      "routes",
      "toolConfig",
    ]);

    requiredSkillName(skill.name, `${skillField}.name`);
    requiredString(skill.description, `${skillField}.description`);
    requiredRelativePath(skill.canonicalPath, `${skillField}.canonicalPath`);

    if (skill.global !== undefined) {
      validateBoolean(skill.global, `${skillField}.global`);
    }

    if (!Array.isArray(skill.references)) {
      throw new Error(`${skillField}.references must be an array.`);
    }

    validateAllowedKeys(skill.routes, `${skillField}.routes`, toolNames);
    for (const toolName of toolNames) {
      requiredRelativePath(skill.routes?.[toolName], `${skillField}.routes.${toolName}`);
    }

    validateAllowedKeys(skill.toolConfig, `${skillField}.toolConfig`, ["cursor", "github"]);
    validateAllowedKeys(skill.toolConfig?.cursor, `${skillField}.toolConfig.cursor`, ["globs", "alwaysApply"]);
    requiredString(skill.toolConfig?.cursor?.globs, `${skillField}.toolConfig.cursor.globs`);
    validateBoolean(skill.toolConfig?.cursor?.alwaysApply, `${skillField}.toolConfig.cursor.alwaysApply`);

    validateAllowedKeys(skill.toolConfig?.github, `${skillField}.toolConfig.github`, ["applyTo"]);
    requiredString(skill.toolConfig?.github?.applyTo, `${skillField}.toolConfig.github.applyTo`);

    if (skill.toolConfig.cursor.globs !== skill.toolConfig.github.applyTo) {
      throw new Error(
        `${skillField}: Cursor globs and GitHub applyTo must match so routed scope stays consistent.`,
      );
    }
  }
}

function parseReadFirstReferences(skill, content) {
  const headingMatch = /^## Read First\s*$/m.exec(content);

  if (!headingMatch) {
    throw new Error(`${skill.name}: canonical skill must contain a ## Read First section.`);
  }

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remainder = content.slice(bodyStart);
  const nextHeadingIndex = remainder.search(/^##\s+/m);
  const body = nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex);
  const references = [];

  for (const line of body.split("\n")) {
    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      continue;
    }

    const referenceMatch = /^-\s+`([^`]+)`\s*$/.exec(trimmedLine);
    if (!referenceMatch) {
      throw new Error(`${skill.name}: ## Read First must contain only backticked reference bullets.`);
    }

    references.push(requiredRelativePath(referenceMatch[1], `${skill.name}.Read First`));
  }

  return references;
}

function validateReadFirstReferences(skill, content, registryReferences) {
  const readFirstReferences = parseReadFirstReferences(skill, content);

  if (readFirstReferences.length !== registryReferences.length) {
    throw new Error(`${skill.name}: ## Read First must match registry references.`);
  }

  for (const [index, referencePath] of registryReferences.entries()) {
    if (readFirstReferences[index] !== referencePath) {
      throw new Error(`${skill.name}: ## Read First must match registry references in the same order.`);
    }
  }
}

async function validateReferences(skill) {
  const seenReferences = new Set();
  const references = referencesForSkill(skill);

  if (references.length === 0) {
    throw new Error(`${skill.name}: references must contain at least one reusable context file.`);
  }

  const normalizedReferences = [];

  for (const reference of references) {
    const referencePath = requiredRelativePath(reference, `${skill.name}.references[]`);

    if (!isPathInsideAny(referencePath, approvedReferenceRoots)) {
      throw new Error(
        `${skill.name}: reference must live under ${approvedReferenceRoots.join(", ")}: ${referencePath}`,
      );
    }

    if (seenReferences.has(referencePath)) {
      throw new Error(`${skill.name}: duplicate reference ${referencePath}`);
    }

    seenReferences.add(referencePath);

    if (!(await fileExists(path.join(rootDir, referencePath)))) {
      throw new Error(`${skill.name}: reference does not exist at ${referencePath}`);
    }

    normalizedReferences.push(referencePath);
  }

  return normalizedReferences;
}

async function validateSkill(skill, seenNames, canonicalRoot) {
  requiredSkillName(skill.name, "skills[].name");
  requiredString(skill.description, `${skill.name}.description`);
  const canonicalPath = requiredRelativePath(skill.canonicalPath, `${skill.name}.canonicalPath`);

  if (!isPathInside(canonicalPath, canonicalRoot)) {
    throw new Error(`${skill.name}: canonicalPath must live under ${canonicalRoot}.`);
  }

  if (seenNames.has(skill.name)) {
    throw new Error(`Duplicate skill name: ${skill.name}`);
  }

  seenNames.add(skill.name);

  const canonicalFile = path.join(rootDir, canonicalPath);
  if (!(await fileExists(canonicalFile))) {
    throw new Error(`${skill.name}: canonical skill does not exist at ${canonicalPath}`);
  }

  const normalizedReferences = await validateReferences(skill);
  const canonicalContent = await readFile(canonicalFile, "utf8");
  validateReadFirstReferences(skill, canonicalContent, normalizedReferences);
}

function validateRoutePath(registry, skill, toolName, seenRoutePaths) {
  const routePath = resolveRoutePath(registry, skill, toolName);
  const routeRoot = routePatternRoot(registry, toolName);

  if (!isPathInside(routePath, routeRoot)) {
    throw new Error(`${skill.name}: ${toolName} route must live under ${routeRoot}.`);
  }

  const seenRoute = seenRoutePaths.get(routePath);
  if (seenRoute) {
    throw new Error(
      `${skill.name}: ${toolName} route collides with ${seenRoute.skillName} ${seenRoute.toolName}: ${routePath}`,
    );
  }

  seenRoutePaths.set(routePath, { skillName: skill.name, toolName });
}

async function validateRegisteredSkillFiles(registry, canonicalRoot) {
  const registeredSkillFiles = new Set(
    registry.skills.map((skill) => requiredRelativePath(skill.canonicalPath, `${skill.name}.canonicalPath`)),
  );

  for (const skillPath of await listFilesRecursive(canonicalRoot)) {
    if (skillPath.endsWith(".md") && !registeredSkillFiles.has(skillPath)) {
      throw new Error(`${skillPath} is not registered in ai/registry.json.`);
    }
  }
}

async function validateExamples() {
  for (const examplePath of await listFilesRecursive("ai/examples")) {
    if (!examplePath.endsWith(".md")) {
      continue;
    }

    const content = await readFile(path.join(rootDir, examplePath), "utf8");
    const sourceMatches = [
      ...content.matchAll(/^Source:\s+`([^`]+)`\s+\(sha256:\s+`([a-f0-9]{64})`\)\s*$/gm),
    ];

    if (sourceMatches.length === 0) {
      throw new Error(
        `${examplePath}: examples must declare Source: \`path/to/source\` (sha256: \`<hash>\`).`,
      );
    }

    if (!content.includes("Why this is canonical:")) {
      throw new Error(`${examplePath}: examples must explain Why this is canonical:.`);
    }

    for (const sourceMatch of sourceMatches) {
      const sourcePath = requiredRelativePath(sourceMatch[1], `${examplePath}.Source`);
      const expectedSourceHash = sourceMatch[2];

      if (!(await fileExists(path.join(rootDir, sourcePath)))) {
        throw new Error(`${examplePath}: Source does not exist at ${sourcePath}.`);
      }

      const actualSourceHash = await fileSha256(sourcePath);
      if (actualSourceHash !== expectedSourceHash) {
        throw new Error(
          `${examplePath}: Source hash for ${sourcePath} is stale. Expected ${expectedSourceHash}, got ${actualSourceHash}. Review the example, then update the hash.`,
        );
      }
    }
  }
}

async function readRegistry() {
  const registry = JSON.parse(await readFile(registryPath, "utf8"));

  validateRegistrySchemaShape(registry);

  if (registry.version !== supportedRegistryVersion) {
    throw new Error(`registry.version must be ${supportedRegistryVersion}.`);
  }

  if (!Array.isArray(registry.skills)) {
    throw new Error("registry.skills must be an array.");
  }

  const canonicalRoot = requiredRelativePath(registry.canonicalRoot, "registry.canonicalRoot");
  const seenNames = new Set();
  for (const skill of registry.skills) {
    await validateSkill(skill, seenNames, canonicalRoot);
  }

  const seenRoutePaths = new Map();
  for (const skill of registry.skills) {
    for (const toolName of toolNames) {
      validateRoutePath(registry, skill, toolName, seenRoutePaths);
    }
  }

  await validateRegisteredSkillFiles(registry, canonicalRoot);
  await validateExamples();

  return registry;
}

async function readSkillContext(skill) {
  const canonicalContent = await readFile(path.join(rootDir, skill.canonicalPath), "utf8");
  const references = [];

  for (const referencePath of referencesForSkill(skill)) {
    references.push({
      content: await readFile(path.join(rootDir, referencePath), "utf8"),
      referencePath,
    });
  }

  return { canonicalContent, references };
}

async function readExisting(routePath) {
  try {
    return await readFile(path.join(rootDir, routePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function syncRoute(routePath, expectedContent, staleRoutes) {
  const currentContent = await readExisting(routePath);

  if (currentContent === expectedContent) {
    return;
  }

  if (checkOnly) {
    staleRoutes.push(routePath);
    return;
  }

  const absolutePath = path.join(rootDir, routePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, expectedContent);
}

async function listFilesRecursive(relativeDirectory) {
  const absoluteDirectory = path.join(rootDir, relativeDirectory);
  let entries;

  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = toPosixPath(path.join(relativeDirectory, entry.name));

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function generatedRouteFiles(registry) {
  const routeRoots = new Set(toolNames.map((toolName) => routePatternRoot(registry, toolName)));
  const generatedFiles = [];

  for (const routeRoot of routeRoots) {
    for (const routePath of await listFilesRecursive(routeRoot)) {
      const content = await readExisting(routePath);
      if (content?.includes(generatedNotice)) {
        generatedFiles.push(routePath);
      }
    }
  }

  return generatedFiles;
}

async function removeOrphanRoute(routePath, orphanRoutes) {
  if (checkOnly) {
    orphanRoutes.push(routePath);
    return;
  }

  await rm(path.join(rootDir, routePath));
}

async function main() {
  const registry = await readRegistry();
  const staleRoutes = [];
  const orphanRoutes = [];
  const expectedRoutes = new Set();
  const routeStats = [];
  const uniqueReferences = new Set();

  for (const skill of registry.skills) {
    const context = await readSkillContext(skill);

    for (const reference of context.references) {
      uniqueReferences.add(reference.referencePath);
    }

    for (const toolName of toolNames) {
      const { content, routePath } = buildRoute(registry, skill, toolName, context);
      expectedRoutes.add(routePath);
      routeStats.push({ bytes: Buffer.byteLength(content, "utf8"), routePath });
      await syncRoute(routePath, content, staleRoutes);
    }
  }

  for (const routePath of await generatedRouteFiles(registry)) {
    if (!expectedRoutes.has(routePath)) {
      await removeOrphanRoute(routePath, orphanRoutes);
    }
  }

  if (staleRoutes.length > 0 || orphanRoutes.length > 0) {
    const staleMessage = staleRoutes.length > 0 ? `Outdated files: ${staleRoutes.join(", ")}` : "";
    const orphanMessage = orphanRoutes.length > 0 ? `Orphan generated files: ${orphanRoutes.join(", ")}` : "";
    throw new Error(
      `AI skill route files are out of sync. Run npm run ai:sync. ${[staleMessage, orphanMessage]
        .filter(Boolean)
        .join(" ")}`,
    );
  }

  const mode = checkOnly ? "checked" : "synced";
  const largestRoutes = routeStats.toSorted((left, right) => right.bytes - left.bytes).slice(0, 5);

  console.log(
    `AI skill routes ${mode}: ${registry.skills.length} skills, ${toolNames.length} tools, ${uniqueReferences.size} reference files.`,
  );

  console.log(
    `Largest compiled routes: ${largestRoutes
      .map(({ bytes, routePath }) => `${routePath} (${Math.round(bytes / 1024)} KB)`)
      .join(", ")}.`,
  );

  for (const route of largestRoutes) {
    if (route.bytes > compiledRouteWarningBytes) {
      console.warn(
        `Warning: ${route.routePath} is ${Math.round(route.bytes / 1024)} KB compiled; consider splitting references.`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
