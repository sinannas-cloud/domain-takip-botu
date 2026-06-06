import test from "node:test";
import assert from "node:assert/strict";

import {
  getTld,
  normalizeDomain,
  parseDomainList,
} from "../src/domain.js";

test("alan adini normalize eder", () => {
  assert.equal(normalizeDomain(" HTTPS://Example.COM. "), "example.com");
});

test("uluslararasi alan adini punycode'a cevirir", () => {
  assert.equal(normalizeDomain("örnek.com"), "xn--rnek-4qa.com");
});

test("listeyi temizler ve tekrar edenleri kaldirir", () => {
  assert.deepEqual(
    parseDomainList("# yorum\nexample.com\nEXAMPLE.com\nexample.net # not"),
    ["example.com", "example.net"],
  );
});

test("TLD degerini bulur", () => {
  assert.equal(getTld("sub.example.co.uk"), "uk");
});

test("gecersiz alan adini reddeder", () => {
  assert.throws(() => normalizeDomain("localhost"), /Gecersiz alan adi/);
});
