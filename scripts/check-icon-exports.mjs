import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const srcDir = join(rootDir, "src");
const iconModulePaths = [
  join(srcDir, "components/ui/icons/action-icons.tsx"),
  join(srcDir, "components/ui/icons/navigation-icons.tsx"),
  join(srcDir, "components/ui/icons/view-icons.tsx"),
];

function walkTsxFiles(dirPath) {
  const paths = [];

  for (const entry of readdirSync(dirPath)) {
    const entryPath = join(dirPath, entry);
    const entryStats = statSync(entryPath);

    if (entryStats.isDirectory()) {
      paths.push(...walkTsxFiles(entryPath));
      continue;
    }

    if (entryPath.endsWith(".tsx")) {
      paths.push(entryPath);
    }
  }

  return paths;
}

function collectImportedIconNames() {
  const imports = new Set();
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*["']@\/components\/ui\/icons["']/gs;

  for (const filePath of walkTsxFiles(srcDir)) {
    const source = readFileSync(filePath, "utf8");

    for (const match of source.matchAll(importPattern)) {
      const names = match[1]
        .replaceAll("\n", " ")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      for (const name of names) {
        imports.add(name);
      }
    }
  }

  return imports;
}

function collectExportedIconNames() {
  const exports = new Set();
  const exportPattern = /export function\s+(\w+)/g;

  for (const filePath of iconModulePaths) {
    const source = readFileSync(filePath, "utf8");

    for (const match of source.matchAll(exportPattern)) {
      exports.add(match[1]);
    }
  }

  return exports;
}

const importedIcons = collectImportedIconNames();
const exportedIcons = collectExportedIconNames();
const missingExports = [...importedIcons].filter((name) => !exportedIcons.has(name)).sort();

if (missingExports.length > 0) {
  console.error("Missing exports in @/components/ui/icons:");

  for (const iconName of missingExports) {
    console.error(`- ${iconName}`);
  }

  process.exit(1);
}

console.log("Icon exports check passed.");
