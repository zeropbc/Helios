import { HeliosObject, heliosObjectSchema } from "@helios/schemas";
import * as fs from "node:fs";
import * as path from "node:path";

export interface ParsedObject {
  filePath: string;
  object: HeliosObject;
}

export interface DataLoadResult {
  objects: Map<string, ParsedObject>;
  files: string[];
  errors: Array<{ filePath: string; message: string }>;
}

const DATA_CATEGORIES = ["stars", "planets", "moons", "systems", "asteroids", "comets", "galaxies", "nebulae"];

export function discoverDataFiles(dataRoot: string): string[] {
  const files: string[] = [];
  for (const category of DATA_CATEGORIES) {
    const dir = path.join(dataRoot, category);
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files.sort();
}

export function loadDataDirectory(dataRoot: string): DataLoadResult {
  const files = discoverDataFiles(dataRoot);
  const objects = new Map<string, ParsedObject>();
  const errors: Array<{ filePath: string; message: string }> = [];

  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(raw);
      const parsed = heliosObjectSchema.safeParse(json);
      if (!parsed.success) {
        errors.push({
          filePath,
          message: zodErrorSummary(parsed.error),
        });
        continue;
      }
      const object = parsed.data;
      if (!object.id) {
        errors.push({ filePath, message: "missing 'id'" });
        continue;
      }
      objects.set(object.id, { filePath, object });
    } catch (err) {
      errors.push({
        filePath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { objects, files, errors };
}

export function buildUniverseGraph(
  result: DataLoadResult
): Map<string, UniverseNode> {
  const nodes = new Map<string, UniverseNode>();
  for (const [id, { object }] of result.objects) {
    nodes.set(id, { id, object, children: [] });
  }
  for (const node of nodes.values()) {
    const rel = node.object.relationships;
    if (!rel) continue;
    for (const child of rel.children ?? []) {
      const childNode = nodes.get(child);
      if (childNode) node.children.push(childNode);
    }
  }
  return nodes;
}

export interface UniverseNode {
  id: string;
  object: HeliosObject;
  children: UniverseNode[];
}

export function zodErrorSummary(error: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): string {
  return (error.issues ?? [])
    .map((iss) => {
      const p = iss.path.join(".");
      return p ? `"${p}": ${iss.message}` : iss.message;
    })
    .join("; ");
}

export interface ValidationReport {
  valid: boolean;
  filesChecked: number;
  objectCount: number;
  errors: Array<{ filePath: string; message: string }>;
  warnings: Array<{ filePath?: string; message: string }>;
}
