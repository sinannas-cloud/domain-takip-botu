import { getTld } from "./domain.js";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const DROP_PHASES = [
  ["pending delete", "pending-delete"],
  ["redemption period", "redemption"],
  ["pending restore", "pending-restore"],
];

let bootstrapPromise;

async function fetchWithTimeout(url, options, timeoutMs) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "application/rdap+json, application/json",
      "user-agent": "DomainTakipBot/0.1",
      ...options?.headers,
    },
  });
  return response;
}

async function loadBootstrap(timeoutMs) {
  if (!bootstrapPromise) {
    bootstrapPromise = fetchWithTimeout(
      BOOTSTRAP_URL,
      undefined,
      timeoutMs,
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`IANA RDAP listesi alinamadi: HTTP ${response.status}`);
      }
      return response.json();
    });
  }

  try {
    return await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = undefined;
    throw error;
  }
}

function findRdapServers(bootstrap, tld) {
  for (const service of bootstrap.services || []) {
    const [tlds, urls] = service;
    if (tlds.some((item) => item.toLowerCase() === tld.toLowerCase())) {
      return urls;
    }
  }
  return [];
}

function findEventDate(events, action) {
  return (
    events?.find((event) => event.eventAction?.toLowerCase() === action)
      ?.eventDate || null
  );
}

export function detectDropPhase(statuses = []) {
  const normalized = statuses.map((status) =>
    String(status).trim().toLowerCase(),
  );

  for (const [rdapStatus, phase] of DROP_PHASES) {
    if (normalized.includes(rdapStatus)) {
      return phase;
    }
  }

  return null;
}

function registeredResult(domain, data, source) {
  const statuses = Array.isArray(data.status) ? data.status : [];

  return {
    domain,
    availability: "registered",
    statuses,
    dropPhase: detectDropPhase(statuses),
    registeredAt: findEventDate(data.events, "registration"),
    expiresAt: findEventDate(data.events, "expiration"),
    changedAt: findEventDate(data.events, "last changed"),
    registrar:
      data.entities?.find((entity) => entity.roles?.includes("registrar"))
        ?.vcardArray?.[1]?.find((field) => field[0] === "fn")?.[3] || null,
    source,
    checkedAt: new Date().toISOString(),
  };
}

export async function checkDomain(domain, { timeoutMs = 15_000 } = {}) {
  const checkedAt = new Date().toISOString();

  try {
    const bootstrap = await loadBootstrap(timeoutMs);
    const servers = findRdapServers(bootstrap, getTld(domain));

    if (servers.length === 0) {
      return {
        domain,
        availability: "unknown",
        error: "Bu uzanti icin IANA RDAP sunucusu bulunamadi.",
        checkedAt,
      };
    }

    const errors = [];
    for (const server of servers) {
      const baseUrl = server.endsWith("/") ? server : `${server}/`;
      const url = new URL(`domain/${encodeURIComponent(domain)}`, baseUrl);

      try {
        const response = await fetchWithTimeout(url, undefined, timeoutMs);

        if (response.status === 404) {
          return {
            domain,
            availability: "available",
            source: url.origin,
            checkedAt,
          };
        }

        if (response.ok) {
          return registeredResult(
            domain,
            await response.json(),
            url.origin,
          );
        }

        errors.push(`${url.origin}: HTTP ${response.status}`);
      } catch (error) {
        errors.push(`${url.origin}: ${error.message}`);
      }
    }

    return {
      domain,
      availability: "unknown",
      error: errors.join("; "),
      checkedAt,
    };
  } catch (error) {
    return {
      domain,
      availability: "unknown",
      error: error.message,
      checkedAt,
    };
  }
}
