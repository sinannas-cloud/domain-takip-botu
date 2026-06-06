import fs from "node:fs/promises";

import { parseDomainList } from "./domain.js";
import { checkDomain } from "./rdap.js";
import { readState, writeState } from "./store.js";

const EXPIRY_THRESHOLDS = [30, 7, 1];

function daysUntil(dateString, now = Date.now()) {
  if (!dateString) {
    return null;
  }

  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.ceil((timestamp - now) / 86_400_000);
}

function getExpiryReminder(result, previous) {
  const days = daysUntil(result.expiresAt);
  if (days === null || days < 0) {
    return null;
  }

  const threshold = EXPIRY_THRESHOLDS.find((value) => days <= value);
  if (!threshold) {
    return null;
  }

  const key = `${result.expiresAt}:${threshold}`;
  if (previous?.expiryReminderKey === key) {
    return null;
  }

  return { days, key };
}

export function createNotification(result, previous) {
  if (result.availability === "available") {
    if (!previous || previous.availability !== "available") {
      return {
        message:
          `ACIL: ${result.domain} RDAP kaydinda BOS/GORUNMUYOR.\n` +
          "Kayit firmasindan hemen uygunlugunu dogrulayin ve kaydetmeyi deneyin.",
      };
    }
    return null;
  }

  if (
    previous?.availability === "available" &&
    result.availability === "registered"
  ) {
    return {
      message: `UYARI: ${result.domain} artik kayitli gorunuyor.`,
    };
  }

  if (
    result.availability === "registered" &&
    result.dropPhase &&
    result.dropPhase !== previous?.dropPhase
  ) {
    return {
      message:
        `ONEMLI: ${result.domain} asamasi degisti: ${result.dropPhase}.\n` +
        `RDAP durumlari: ${result.statuses.join(", ")}`,
    };
  }

  if (result.availability === "registered") {
    const reminder = getExpiryReminder(result, previous);
    if (reminder) {
      return {
        message:
          `HATIRLATMA: ${result.domain} kaydinin RDAP bitis tarihine ` +
          `${reminder.days} gun kaldi (${result.expiresAt}).`,
        expiryReminderKey: reminder.key,
      };
    }
  }

  const failureCount =
    result.availability === "unknown"
      ? (previous?.failureCount || 0) + 1
      : 0;

  if (failureCount === 3) {
    return {
      message:
        `KONTROL HATASI: ${result.domain} arka arkaya 3 kez sorgulanamadi.\n` +
        `Son hata: ${result.error}`,
      failureCount,
    };
  }

  return { failureCount, silent: true };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function runCheck({ config, notifier }) {
  const domainFile = await fs.readFile(config.domainsFile, "utf8");
  const domains = parseDomainList(domainFile);

  if (domains.length === 0) {
    throw new Error(
      `${config.domainsFile} dosyasinda takip edilecek alan adi yok.`,
    );
  }

  const state = await readState(config.stateFile);
  const results = await mapWithConcurrency(
    domains,
    config.concurrency,
    (domain) =>
      checkDomain(domain, {
        timeoutMs: config.requestTimeoutMs,
      }),
  );

  for (const result of results) {
    const previous = state.domains[result.domain];
    const notification = createNotification(result, previous);
    const failureCount =
      notification?.failureCount ??
      (result.availability === "unknown"
        ? (previous?.failureCount || 0) + 1
        : 0);

    const next = {
      ...previous,
      ...result,
      failureCount,
      expiryReminderKey:
        notification?.expiryReminderKey ??
        (previous?.expiresAt === result.expiresAt
          ? previous?.expiryReminderKey
          : undefined),
    };
    state.domains[result.domain] = next;

    if (notification && !notification.silent) {
      try {
        await notifier.send(notification.message);
        next.lastNotificationAt = new Date().toISOString();
      } catch (error) {
        console.error(`[${result.domain}] ${error.message}`);
      }
    }

    const detail = result.error ? ` - ${result.error}` : "";
    console.log(
      `[${result.checkedAt}] ${result.domain}: ${result.availability}${detail}`,
    );
  }

  await writeState(config.stateFile, state);
  return results;
}
