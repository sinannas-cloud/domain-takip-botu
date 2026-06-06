import { domainToASCII } from "node:url";

export function normalizeDomain(input) {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.$/, "");
  const ascii = domainToASCII(value);

  if (!ascii || ascii.length > 253 || !ascii.includes(".")) {
    throw new Error(`Gecersiz alan adi: ${input}`);
  }

  const labels = ascii.split(".");
  const valid = labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );

  if (!valid) {
    throw new Error(`Gecersiz alan adi: ${input}`);
  }

  return ascii;
}

export function getTld(domain) {
  return domain.slice(domain.lastIndexOf(".") + 1);
}

export function parseDomainList(content) {
  const domains = new Set();
  const errors = [];

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) {
      continue;
    }

    try {
      domains.add(normalizeDomain(line));
    } catch (error) {
      errors.push(`Satir ${index + 1}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return [...domains];
}
