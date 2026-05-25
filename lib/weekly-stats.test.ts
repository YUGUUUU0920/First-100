import { test, expect, describe } from "bun:test";
import { shanghaiWeekBounds } from "./weekly-stats";

/**
 * shanghaiWeekBounds drives the founder's core success metric ("当周被回复数")
 * and the weekly poster. Week math across the Shanghai UTC+8 offset, the
 * Monday anchor, and the year boundary is classic off-by-one territory — if
 * it's wrong, the founder's main feedback signal is silently wrong.
 *
 * Reference anchors (hand-verified): 2026-01-01 is a Thursday, so ISO W01 of
 * 2026 spans Mon 2025-12-29 → Sun 2026-01-04, and W02 starts Mon 2026-01-05.
 * Shanghai Monday 00:00 == previous Sunday 16:00 UTC.
 */

describe("shanghaiWeekBounds — specific anchored cases", () => {
  test("Monday (Shanghai noon) anchors to that Monday, W02", () => {
    // 2026-01-05T04:00Z == Mon 2026-01-05 12:00 Shanghai
    const r = shanghaiWeekBounds(new Date("2026-01-05T04:00:00Z"));
    expect(r.week_start_utc.toISOString()).toBe("2026-01-04T16:00:00.000Z");
    expect(r.week_end_utc.toISOString()).toBe("2026-01-11T16:00:00.000Z");
    expect(r.iso_week).toBe("2026-W02");
  });

  test("Sunday late (Shanghai Sun 20:00) stays in the prior week, W01 spanning year boundary", () => {
    // 2026-01-04T12:00Z == Sun 2026-01-04 20:00 Shanghai → week started Mon 2025-12-29
    const r = shanghaiWeekBounds(new Date("2026-01-04T12:00:00Z"));
    expect(r.week_start_utc.toISOString()).toBe("2025-12-28T16:00:00.000Z");
    expect(r.iso_week).toBe("2026-W01");
  });

  test("timezone rollover: Sunday 17:00 UTC is already Monday in Shanghai → next week, W02", () => {
    // 2026-01-04T17:00Z == Mon 2026-01-05 01:00 Shanghai
    const r = shanghaiWeekBounds(new Date("2026-01-04T17:00:00Z"));
    expect(r.week_start_utc.toISOString()).toBe("2026-01-04T16:00:00.000Z");
    expect(r.iso_week).toBe("2026-W02");
  });

  test("mid-year Monday computes correct ISO week (2026-05-18 → W21)", () => {
    const r = shanghaiWeekBounds(new Date("2026-05-18T04:00:00Z"));
    expect(r.iso_week).toBe("2026-W21");
  });
});

describe("shanghaiWeekBounds — invariants (any date)", () => {
  const samples = [
    "2026-01-04T12:00:00Z", // Sunday
    "2026-01-05T00:00:00Z", // Monday boundary
    "2026-03-15T23:59:59Z",
    "2026-07-01T08:30:00Z",
    "2026-12-31T16:00:00Z", // year-end
    "2024-02-29T10:00:00Z", // leap day
  ];

  for (const iso of samples) {
    test(`week_start is Monday 00:00 Shanghai + span is exactly 7 days (${iso})`, () => {
      const r = shanghaiWeekBounds(new Date(iso));
      // Shanghai-local view of week_start: add the +8h offset back.
      const startShanghai = new Date(r.week_start_utc.getTime() + 480 * 60_000);
      expect(startShanghai.getUTCDay()).toBe(1); // Monday
      expect(startShanghai.getUTCHours()).toBe(0);
      expect(startShanghai.getUTCMinutes()).toBe(0);
      expect(startShanghai.getUTCSeconds()).toBe(0);
      // Exactly 7 days between start and end.
      expect(r.week_end_utc.getTime() - r.week_start_utc.getTime()).toBe(7 * 86_400_000);
    });
  }

  test("the reference instant always falls within [start, end)", () => {
    for (const iso of samples) {
      const ref = new Date(iso);
      const r = shanghaiWeekBounds(ref);
      expect(ref.getTime()).toBeGreaterThanOrEqual(r.week_start_utc.getTime());
      expect(ref.getTime()).toBeLessThan(r.week_end_utc.getTime());
    }
  });

  test("iso_week always matches YYYY-Www format", () => {
    for (const iso of samples) {
      expect(shanghaiWeekBounds(new Date(iso)).iso_week).toMatch(/^\d{4}-W\d{2}$/);
    }
  });
});
