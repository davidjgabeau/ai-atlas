import { readFile } from "node:fs/promises";
import path from "node:path";

import { bannedUserFacingPhrases } from "../src/lib/agent/qualityGate";
import type { EditorialSurface } from "../src/types/agent";

async function main() {
  const surfacePath = path.join(process.cwd(), "data", "editorial-surfaces.json");
  const raw = await readFile(surfacePath, "utf8");
  const surfaces = JSON.parse(raw) as EditorialSurface[];
  const currentReadSurfaces = surfaces.filter(
    (surface) => surface.surface === "current_read",
  );
  const failures: string[] = [];

  if (currentReadSurfaces.length === 0) {
    failures.push("No current_read surface found.");
  }

  for (const surface of currentReadSurfaces) {
    if (surface.items.length !== 3) {
      failures.push(`${surface.id}: expected exactly 3 items, found ${surface.items.length}.`);
    }

    for (const [index, item] of surface.items.entries()) {
      const label = `${surface.id}/item-${index + 1}`;
      const title = item.title ?? "";
      const body = item.body ?? "";
      const text = `${title} ${body}`.toLowerCase();

      if (!title.trim()) failures.push(`${label}: missing title.`);
      if (!body.trim()) failures.push(`${label}: missing body.`);
      if (title.trim().split(/\s+/).length > 8) {
        failures.push(`${label}: title has more than 8 words.`);
      }
      if (body.length > 280) {
        failures.push(`${label}: body is longer than 280 characters.`);
      }

      for (const phrase of bannedUserFacingPhrases) {
        if (text.includes(phrase)) {
          failures.push(`${label}: contains banned phrase "${phrase}".`);
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Current Read copy check passed for ${currentReadSurfaces.length} surface(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
