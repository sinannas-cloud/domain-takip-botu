import { execFileSync } from "node:child_process";
import fs from "node:fs";

const stateFile = "data/state.json";
const volatileKeys = new Set(["checkedAt", "updatedAt"]);
const heartbeatIntervalMs = 30 * 24 * 60 * 60 * 1000;

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !volatileKeys.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }

  return value;
}

let previousText;
try {
  previousText = execFileSync("git", ["show", `HEAD:${stateFile}`], {
    encoding: "utf8",
  });
} catch {
  process.exit(0);
}

const currentText = fs.readFileSync(stateFile, "utf8");
const previousRaw = JSON.parse(previousText);
const currentRaw = JSON.parse(currentText);
const previous = stableValue(previousRaw);
const current = stableValue(currentRaw);
const previousUpdateTime = Date.parse(previousRaw.updatedAt);
const heartbeatDue =
  Number.isNaN(previousUpdateTime) ||
  Date.now() - previousUpdateTime >= heartbeatIntervalMs;

if (!heartbeatDue && JSON.stringify(previous) === JSON.stringify(current)) {
  fs.writeFileSync(stateFile, previousText, "utf8");
}
