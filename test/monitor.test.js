import test from "node:test";
import assert from "node:assert/strict";

import { createNotification } from "../src/monitor.js";
import { detectDropPhase } from "../src/rdap.js";

test("ilk bos sonuc icin acil bildirim olusturur", () => {
  const notification = createNotification(
    { domain: "example.com", availability: "available" },
    undefined,
  );

  assert.match(notification.message, /ACIL/);
});

test("degismeyen bos sonuc icin tekrar bildirim gondermez", () => {
  const notification = createNotification(
    { domain: "example.com", availability: "available" },
    { domain: "example.com", availability: "available" },
  );

  assert.equal(notification, null);
});

test("ucuncu ard arda hatada bildirim olusturur", () => {
  const notification = createNotification(
    {
      domain: "example.test",
      availability: "unknown",
      error: "zaman asimi",
    },
    { availability: "unknown", failureCount: 2 },
  );

  assert.match(notification.message, /3 kez/);
  assert.equal(notification.failureCount, 3);
});

test("RDAP drop asamasini algilar", () => {
  assert.equal(detectDropPhase(["pending delete"]), "pending-delete");
  assert.equal(detectDropPhase(["active"]), null);
});
