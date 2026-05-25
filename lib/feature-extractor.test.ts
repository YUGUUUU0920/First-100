import { test, expect, describe } from "bun:test";
import { extractOutreachFeatures, FEATURE_SCHEMA_VERSION } from "./feature-extractor";

/**
 * The feature vector is the data-flywheel moat (CEO review Pick #2). If these
 * features silently change shape or compute wrong, the future ranking model
 * trains on garbage. These tests lock the contract — especially important
 * before the embedding dimension gets added.
 */

const baseProspect = {
  aiRelevanceScore: 8.5,
  postScore: 42,
  postReplyCount: 13,
  postAgeDays: 3,
  sourcePlatform: "v2ex",
};

function run(
  outreachOverrides: Partial<Parameters<typeof extractOutreachFeatures>[0]["outreach"]> = {},
  markedAt = new Date("2026-05-25T14:30:00Z")
) {
  return extractOutreachFeatures({
    outreach: {
      finalText: "默认文本",
      draftV1: "草稿",
      wasRewritten: false,
      critiqueScore: 9,
      draftedAt: new Date("2026-05-25T12:30:00Z").toISOString(),
      ...outreachOverrides,
    },
    prospect: baseProspect,
    markedAt,
  });
}

describe("extractOutreachFeatures — text shape", () => {
  test("counts text length from finalText", () => {
    expect(run({ finalText: "12345" }).text_len).toBe(5);
  });

  test("falls back to draftV1 when finalText is null", () => {
    expect(run({ finalText: null, draftV1: "七个字的草稿啊" }).text_len).toBe(7);
  });

  test("detects question marks — both ASCII and full-width", () => {
    expect(run({ finalText: "你试过了吗?" }).has_question).toBe(true);
    expect(run({ finalText: "你试过了吗？" }).has_question).toBe(true);
    expect(run({ finalText: "没有问号" }).has_question).toBe(false);
  });

  test("detects URLs (spam signal)", () => {
    expect(run({ finalText: "看 https://x.com" }).has_url).toBe(true);
    expect(run({ finalText: "没有链接" }).has_url).toBe(false);
  });

  test("detects product-mention markers (PS / 顺带 / btw / 对了)", () => {
    expect(run({ finalText: "...PS 我做了个工具" }).has_ps).toBe(true);
    expect(run({ finalText: "顺带提一句" }).has_ps).toBe(true);
    expect(run({ finalText: "btw 这个不错" }).has_ps).toBe(true);
    expect(run({ finalText: "对了，你看过吗" }).has_ps).toBe(true);
    expect(run({ finalText: "纯聊天没有推荐" }).has_ps).toBe(false);
  });

  test("counts emoji", () => {
    expect(run({ finalText: "加油 🚀🔥" }).emoji_count).toBe(2);
    expect(run({ finalText: "无表情" }).emoji_count).toBe(0);
  });

  test("counts exclamations — both ASCII and full-width", () => {
    expect(run({ finalText: "牛!太强了！" }).exclam_count).toBe(2);
  });

  test("detects ellipsis — both ... and …", () => {
    expect(run({ finalText: "嗯..." }).has_ellipsis).toBe(true);
    expect(run({ finalText: "嗯…" }).has_ellipsis).toBe(true);
    expect(run({ finalText: "没有省略号" }).has_ellipsis).toBe(false);
  });
});

describe("extractOutreachFeatures — prospect + meta", () => {
  test("passes prospect quality signals through", () => {
    const f = run();
    expect(f.prospect_ai_score).toBe(8.5);
    expect(f.prospect_post_score).toBe(42);
    expect(f.prospect_reply_count).toBe(13);
    expect(f.prospect_age_days).toBe(3);
    expect(f.source_platform).toBe("v2ex");
  });

  test("carries critique_score + was_rewritten", () => {
    const f = run({ critiqueScore: 7, wasRewritten: true });
    expect(f.critique_score).toBe(7);
    expect(f.was_rewritten).toBe(true);
  });

  test("stamps schema version + reserves embedding slot", () => {
    const f = run();
    expect(f.v).toBe(FEATURE_SCHEMA_VERSION);
    expect(f.source).toBe("dashboard_button");
    expect(f.embedding).toBeNull();
  });
});

describe("extractOutreachFeatures — timing", () => {
  test("computes UTC hour + day-of-week from markedAt", () => {
    const f = run({}, new Date("2026-05-25T14:30:00Z")); // Monday
    expect(f.marked_hour_utc).toBe(14);
    expect(f.marked_dow_utc).toBe(1);
  });

  test("computes hours since drafted", () => {
    const f = run(
      { draftedAt: new Date("2026-05-25T12:30:00Z").toISOString() },
      new Date("2026-05-25T14:30:00Z")
    );
    expect(f.hours_since_drafted).toBe(2);
  });

  test("clamps negative hours_since_drafted to 0 (clock skew guard)", () => {
    const f = run(
      { draftedAt: new Date("2026-05-25T15:00:00Z").toISOString() }, // after markedAt
      new Date("2026-05-25T14:30:00Z")
    );
    expect(f.hours_since_drafted).toBe(0);
  });

  test("null draftedAt → null hours_since_drafted (not NaN/0)", () => {
    expect(run({ draftedAt: null }).hours_since_drafted).toBeNull();
  });
});
