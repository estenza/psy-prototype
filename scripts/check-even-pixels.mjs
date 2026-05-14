import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIRS = ["src"];
const CHECKED_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
]);

const issues = [];

function isAllowedPixelValue(value) {
  const absoluteValue = Math.abs(value);

  return Number.isInteger(absoluteValue)
    && (absoluteValue === 1 || absoluteValue % 2 === 0);
}

function checkFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const matches = line.matchAll(/-?(?:\d+|\d*\.\d+)px\b/g);

    for (const match of matches) {
      const rawValue = match[0].slice(0, -"px".length);
      const value = Number(rawValue);

      if (!Number.isFinite(value) || isAllowedPixelValue(value)) {
        continue;
      }

      issues.push({
        column: (match.index ?? 0) + 1,
        filePath,
        line: index + 1,
        value: match[0],
      });
    }
  });
}

function walkDirectory(directoryPath) {
  for (const entryName of readdirSync(directoryPath)) {
    if (IGNORED_DIRS.has(entryName)) {
      continue;
    }

    const entryPath = path.join(directoryPath, entryName);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      walkDirectory(entryPath);
      continue;
    }

    if (CHECKED_EXTENSIONS.has(path.extname(entryPath))) {
      checkFile(entryPath);
    }
  }
}

for (const rootDir of ROOT_DIRS) {
  walkDirectory(rootDir);
}

if (issues.length > 0) {
  console.error("Odd or fractional px values are not allowed. Use even px values; 1px is allowed for hairline borders.");

  for (const issue of issues) {
    console.error(`${issue.filePath}:${issue.line}:${issue.column} ${issue.value}`);
  }

  process.exit(1);
}

console.log("Even pixel values check passed.");
