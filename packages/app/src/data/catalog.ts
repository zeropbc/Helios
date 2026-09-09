import { HeliosObject, heliosObjectSchema } from "@helios/schemas";

/**
 * Browser-side data loading. The data/ directory is served as static
 * assets (Vite publicDir). Objects are validated against the strict Zod
 * schema before entering the universe — the same contract the CLI enforces.
 */

const CATEGORIES = ["stars", "planets", "moons", "systems"];

export interface LoadedData {
  objects: HeliosObject[];
  errors: Array<{ file: string; message: string }>;
}

const CATALOG: Record<string, string[]> = {
  stars: [
    "sol",
    "proxima-centauri",
    "alpha-centauri-a",
    "alpha-centauri-b",
  ],
  planets: [
    "mercury",
    "venus",
    "earth",
    "mars",
    "proxima-centauri-b",
    "proxima-centauri-c",
    "proxima-centauri-d",
  ],
  moons: ["luna"],
  systems: ["solar-system", "alpha-centauri"],
};

export async function fetchCatalog(): Promise<LoadedData> {
  const objects: HeliosObject[] = [];
  const errors: Array<{ file: string; message: string }> = [];

  for (const category of CATEGORIES) {
    const entries = CATALOG[category] ?? [];
    for (const slug of entries) {
      try {
        // publicDir contents are served at the site root, so the data/
        // prefix is NOT part of the URL.
        const res = await fetch(`/${category}/${slug}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/html")) {
          throw new Error("served HTML fallback instead of JSON (publicDir misconfigured)");
        }
        const json = await res.json();
        const parsed = heliosObjectSchema.safeParse(json);
        if (!parsed.success) {
          errors.push({
            file: `${category}/${slug}.json`,
            message: parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          });
          continue;
        }
        objects.push(parsed.data);
      } catch (err) {
        errors.push({
          file: `${category}/${slug}.json`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { objects, errors };
}