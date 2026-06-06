import process from "node:process";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const [{ config, validateConfig }, { runCheck }, { createTelegramNotifier }] =
  await Promise.all([
    import("./config.js"),
    import("./monitor.js"),
    import("./notifier.js"),
  ]);

validateConfig();

const notifier = createTelegramNotifier({
  token: config.telegramBotToken,
  chatId: config.telegramChatId,
  timeoutMs: config.requestTimeoutMs,
});
const once = process.argv.includes("--once");
let stopping = false;
let waitTimer;
let finishWaiting;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopping = true;
    clearTimeout(waitTimer);
    finishWaiting?.();
    console.log(`${signal} alindi, bot durduruluyor.`);
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    finishWaiting = resolve;
    waitTimer = setTimeout(resolve, ms);
  }).finally(() => {
    waitTimer = undefined;
    finishWaiting = undefined;
  });
}

async function check() {
  try {
    const results = await runCheck({ config, notifier });
    const counts = results.reduce(
      (summary, result) => {
        summary[result.availability] += 1;
        return summary;
      },
      { available: 0, registered: 0, unknown: 0 },
    );
    console.log(
      `Kontrol tamamlandi: ${counts.registered} kayitli, ` +
        `${counts.available} bos, ${counts.unknown} belirsiz.`,
    );
  } catch (error) {
    console.error(error.stack || error.message);
    if (once) {
      process.exitCode = 1;
    }
  }
}

await check();

if (!once) {
  const intervalMs = config.checkIntervalMinutes * 60_000;
  console.log(
    `Bot calisiyor. Sonraki kontroller ${config.checkIntervalMinutes} dakikada bir yapilacak.`,
  );

  while (!stopping) {
    await wait(intervalMs);
    if (!stopping) {
      await check();
    }
  }
}
