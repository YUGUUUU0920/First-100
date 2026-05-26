import { test, expect, describe } from "bun:test";
import { ageDays } from "./v2ex";

/**
 * ageDays is the shared date helper for ALL four sources (v2ex t.created,
 * juejin a.ctime, sspai a.released_at) — every prospect's post_age_days flows
 * through it, and post_age_days is a feature in the data-flywheel vector
 * (lib/feature-extractor). Contract: input is unix SECONDS; output is whole
 * days elapsed, floored, never negative.
 */

const DAY = 86_400;

describe("ageDays", () => {
  test("a post from exactly N days ago → N", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(ageDays(nowSec - 3 * DAY)).toBe(3);
    expect(ageDays(nowSec - 30 * DAY)).toBe(30);
  });

  test("a post from right now → 0", () => {
    expect(ageDays(Math.floor(Date.now() / 1000))).toBe(0);
  });

  test("partial days floor down", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(ageDays(nowSec - (DAY + DAY / 2))).toBe(1); // 1.5 days → 1
    expect(ageDays(nowSec - (DAY - 10))).toBe(0); // just under a day → 0
  });

  test("future timestamps clamp to 0 (clock skew / bad data guard)", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(ageDays(nowSec + 10 * DAY)).toBe(0);
  });
});
