import { HeliosObject } from "@helios/schemas";
import { DataLoadResult, ValidationReport } from "./loader.js";

const VALID_UNITS = new Set([
  "m", "km", "AU", "pc", "ly", "kg", "M_earth", "M_jupiter", "M_sun",
  "R_earth", "R_jupiter", "R_sun", "L_sun", "K", "deg", "rad", "m/s",
  "km/s", "mas", "mas/yr", "arcsec/yr", "day", "yr", "Myr", "Gyr",
  "mag", "W", "Jy",
]);

function isUncertaintyValid(u: unknown): boolean {
  if (typeof u === "number") return u >= 0;
  if (u && typeof u === "object") {
    const obj = u as { plus?: number; minus?: number };
    const has = (v: unknown): v is number => typeof v === "number";
    if (!has(obj.plus) || !has(obj.minus)) return false;
    return obj.plus >= 0 && obj.minus >= 0;
  }
  return true;
}

function walkMeasurements(
  obj: unknown,
  cb: (value: unknown, context: string) => void,
  prefix = ""
): void {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkMeasurements(v, cb, `${prefix}[${i}]`));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      walkMeasurements(v, cb, prefix ? `${prefix}.${k}` : k);
    }
    return;
  }
  const box = obj as { unit?: unknown; value?: unknown };
  if (box && typeof box === "object" && "unit" in box && "value" in box) {
    cb(obj, prefix);
  }
}

export function validateLoad(
  result: DataLoadResult,
  strictRefs = true
): ValidationReport {
  const warnings: Array<{ filePath?: string; message: string }> = [];
  const errors: Array<{ filePath: string; message: string }> = [...result.errors];

  const ids = new Set(result.objects.keys());

  for (const { object, filePath } of result.objects.values()) {
    validateSemantics(object, filePath, ids, errors, warnings, strictRefs);
  }

  const valid = errors.length === 0;
  return {
    valid,
    filesChecked: result.files.length,
    objectCount: result.objects.size,
    errors,
    warnings,
  };
}

function validateSemantics(
  obj: HeliosObject,
  filePath: string,
  ids: Set<string>,
  errors: Array<{ filePath: string; message: string }>,
  warnings: Array<{ filePath?: string; message: string }>,
  strictRefs: boolean
): void {
  const fail = (message: string) => errors.push({ filePath, message });
  const warn = (message: string) => warnings.push({ filePath, message });

  if (!obj.schema_version) fail("missing schema_version");
  if (!obj.id) fail("missing id");
  if (!obj.identity?.name) fail("missing identity.name");

  // RA / Dec range validation
  const m = obj.measurements;
  if (m?.position) {
    const ra = m.position.right_ascension?.value;
    if (ra !== undefined && (ra < 0 || ra > 360))
      fail(`right_ascension ${ra} outside 0-360 deg`);
    const dec = m.position.declination?.value;
    if (dec !== undefined && (dec < -90 || dec > 90))
      fail(`declination ${dec} outside -90 to +90 deg`);
  }

  // Negative mass
  if (m?.mass?.value !== undefined && m.mass.value < 0)
    fail(`mass ${m.mass.value} is negative`);

  // Radius
  if (m?.radius?.value !== undefined && m.radius.value < 0)
    fail(`radius ${m.radius.value} is negative`);

  // Eccentricity range in orbit components
  const components = obj.components ?? {};
  for (const [compName, comp] of Object.entries(components)) {
    if (comp?.type !== "orbit") continue;
    const orbit = comp.orbit;
    const ecc = orbit?.eccentricity;
    if (ecc !== undefined && (ecc < 0 || ecc > 1))
      fail(`component "${compName}": eccentricity ${ecc} outside 0-1`);
    if (!orbit?.primary) fail(`component "${compName}": missing orbit primary`);
  }

  // Orbit primary references exist
  if (strictRefs && components) {
    for (const [compName, comp] of Object.entries(components)) {
      if (comp?.type !== "orbit") continue;
      const primary = comp.orbit?.primary;
      if (primary && !ids.has(primary)) {
        fail(`component "${compName}": orbit primary "${primary}" is a broken reference`);
      }
    }
  }

  // Relationship references
  if (obj.relationships) {
    const rel = obj.relationships;
    const refs = [
      ...(rel.parent ? [rel.parent] : []),
      ...(rel.companions ?? []),
      ...(rel.children ?? []),
    ];
    if (strictRefs) {
      for (const ref of refs) {
        if (!ids.has(ref)) fail(`relationship reference "${ref}" is a broken reference`);
      }
    }
  }

  // Uncertainty validation
  walkMeasurements(m, (value, context) => {
    const v = value as { uncertainty?: unknown };
    if (v.uncertainty !== undefined && !isUncertaintyValid(v.uncertainty))
      fail(`measurements.${context}: invalid uncertainty`);
  });

  // Units belong to controlled vocabulary
  walkMeasurements(m, (value, context) => {
    const v = value as { unit?: unknown };
    if (v.unit !== undefined && typeof v.unit === "string" && !VALID_UNITS.has(v.unit)) {
      fail(`measurements.${context}: unit "${v.unit}" not in controlled vocabulary`);
    }
  });

  // Duplicate designation check
  const designations = obj.identity?.designations;
  if (designations) {
    const seen = new Set<string>();
    for (const d of designations) {
      if (seen.has(d)) warn(`duplicate designation "${d}"`);
      seen.add(d);
    }
  }

  // Variability period type handling
  if (obj.variability && "period" in obj.variability && obj.variability.period === null) {
    // period null is allowed for flare stars (aperiodic)
  }
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push(
    report.valid ? "✅ VALID" : "❌ INVALID"
  );
  lines.push(
    `  ${report.filesChecked} file(s), ${report.objectCount} object(s) checked`
  );
  for (const e of report.errors) {
    lines.push(`  ERROR  ${e.filePath}: ${e.message}`);
  }
  for (const w of report.warnings) {
    lines.push(`  WARN   ${w.message}`);
  }
  return lines.join("\n");
}
