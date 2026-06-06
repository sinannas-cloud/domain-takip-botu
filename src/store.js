import fs from "node:fs/promises";
import path from "node:path";

export async function readState(file) {
  try {
    const content = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(content);
    return {
      version: 1,
      domains: parsed.domains || {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { version: 1, domains: {}, updatedAt: null };
    }
    throw error;
  }
}

export async function writeState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporaryFile = `${file}.tmp`;
  const nextState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(nextState, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(temporaryFile, file);
}
