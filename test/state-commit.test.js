import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const script = path.resolve("scripts/prepare-state-commit.mjs");

function runGit(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

test("yalnizca kontrol zamani degistiyse onceki kaydi geri yukler", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "domain-state-"));
  fs.mkdirSync(path.join(directory, "data"));
  runGit(directory, ["init"]);
  runGit(directory, ["config", "user.name", "Test"]);
  runGit(directory, ["config", "user.email", "test@example.com"]);

  const stateFile = path.join(directory, "data", "state.json");
  const previous = {
    version: 1,
    domains: {
      "example.com": {
        availability: "registered",
        checkedAt: "2026-01-01T00:00:00Z",
      },
    },
    updatedAt: "2026-01-01T00:00:00Z",
  };
  fs.writeFileSync(stateFile, `${JSON.stringify(previous, null, 2)}\n`);
  runGit(directory, ["add", "data/state.json"]);
  runGit(directory, ["commit", "-m", "initial"]);

  const current = structuredClone(previous);
  current.domains["example.com"].checkedAt = "2026-01-02T00:00:00Z";
  current.updatedAt = "2026-01-02T00:00:00Z";
  fs.writeFileSync(stateFile, `${JSON.stringify(current, null, 2)}\n`);

  execFileSync(process.execPath, [script], { cwd: directory });

  assert.equal(runGit(directory, ["diff", "--", "data/state.json"]), "");
});
