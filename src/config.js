import path from "node:path";

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  domainsFile: path.resolve(process.env.DOMAINS_FILE || "domains.txt"),
  stateFile: path.resolve(process.env.STATE_FILE || "data/state.json"),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID?.trim() || "",
  checkIntervalMinutes: toPositiveInteger(
    process.env.CHECK_INTERVAL_MINUTES,
    15,
  ),
  concurrency: toPositiveInteger(process.env.CHECK_CONCURRENCY, 3),
  requestTimeoutMs: toPositiveInteger(process.env.REQUEST_TIMEOUT_MS, 15_000),
};

export function validateConfig() {
  const hasToken = Boolean(config.telegramBotToken);
  const hasChatId = Boolean(config.telegramChatId);

  if (hasToken !== hasChatId) {
    throw new Error(
      "Telegram bildirimi icin TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID birlikte ayarlanmalidir.",
    );
  }
}
