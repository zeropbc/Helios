#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadDataDirectory,
  validateLoad,
  formatReport,
  buildUniverseGraph,
} from "@helios/data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findDataRoot(cwd: string): string | null {
  let current = cwd;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, "data"))) return path.join(current, "data");
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  // fallback to workspace root relative to this package
  const candidate = path.resolve(__dirname, "../../../data");
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

function printHelp(): void {
  console.log(
    [
      "helios — validate and index astronomical data",
      "",
      "Usage:",
      "  helios validate [path]   Validate data directory (default: ./data)",
      "  helios index [path]      Validate and print universe graph summary",
      "  helios --help            Show this help",
    ].join("\n")
  );
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  printHelp();
  process.exit(0);
}

const command = args[0];
const target = args[1];

let dataRoot: string | null;
if (target) {
  dataRoot = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : null;
} else {
  dataRoot = findDataRoot(process.cwd());
}

if (!dataRoot) {
  console.error("Could not find a data/ directory. Run from the Helios repo root or pass an explicit path.");
  process.exit(1);
}

switch (command) {
  case "validate": {
    const result = loadDataDirectory(dataRoot);
    const report = validateLoad(result);
    console.log(formatReport(report));
    process.exit(report.valid ? 0 : 1);
    break;
  }
  case "index": {
    const result = loadDataDirectory(dataRoot);
    const report = validateLoad(result);
    console.log(formatReport(report));
    if (!report.valid) process.exit(1);
    const graph = buildUniverseGraph(result);
    console.log(`\nUniverse graph: ${graph.size} root node(s)`);
    for (const node of graph.values()) {
      printNode(node, 0);
    }
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

function printNode(
  node: { id: string; children: { id: string }[] },
  depth: number
): void {
  console.log(`${"  ".repeat(depth)}• ${node.id}`);
  for (const child of node.children) {
    printNode(child as { id: string; children: { id: string }[] }, depth + 1);
  }
}
