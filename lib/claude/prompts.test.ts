import { test, expect, describe } from "bun:test";
import {
  parseOutreachGenerationOutput,
  parseOutreachCritiqueOutput,
  parseRelevanceFilterOutput,
  OUTREACH_MIN_CHARS,
  OUTREACH_HARD_CAP,
} from "./prompts";

/**
 * These three parsers are the LLM output trust boundary (/cso §LLM Output
 * Trust). They consume untrusted model output and must NEVER let malformed /
 * runaway / wrong-typed data through to the DB or the user's clipboard.
 * Defensive contract: return null on anything suspect so the caller marks
 * ai_failed and retries.
 */

const validDraft = "你这个冷启动的问题我太懂了，最后是发 indie 群里慢慢搞起来的。"; // ~28 chars, in-bounds

describe("parseOutreachGenerationOutput", () => {
  test("parses clean JSON", () => {
    const r = parseOutreachGenerationOutput(`{"draft":"${validDraft}","rationale":"引用细节"}`);
    expect(r).not.toBeNull();
    expect(r!.draft).toBe(validDraft);
    expect(r!.rationale).toBe("引用细节");
  });

  test("strips ```json fences", () => {
    const r = parseOutreachGenerationOutput("```json\n" + `{"draft":"${validDraft}"}` + "\n```");
    expect(r).not.toBeNull();
    expect(r!.draft).toBe(validDraft);
  });

  test("strips bare ``` fences", () => {
    const r = parseOutreachGenerationOutput("```\n" + `{"draft":"${validDraft}"}` + "\n```");
    expect(r).not.toBeNull();
  });

  test("rationale defaults to empty string when missing or non-string", () => {
    expect(parseOutreachGenerationOutput(`{"draft":"${validDraft}"}`)!.rationale).toBe("");
    expect(
      parseOutreachGenerationOutput(`{"draft":"${validDraft}","rationale":42}`)!.rationale
    ).toBe("");
  });

  test("rejects drafts shorter than OUTREACH_MIN_CHARS", () => {
    const short = "x".repeat(OUTREACH_MIN_CHARS - 1);
    expect(parseOutreachGenerationOutput(`{"draft":"${short}"}`)).toBeNull();
  });

  test("accepts a draft exactly at OUTREACH_MIN_CHARS", () => {
    const exact = "x".repeat(OUTREACH_MIN_CHARS);
    expect(parseOutreachGenerationOutput(`{"draft":"${exact}"}`)).not.toBeNull();
  });

  test("rejects runaway drafts longer than OUTREACH_HARD_CAP", () => {
    const long = "x".repeat(OUTREACH_HARD_CAP + 1);
    expect(parseOutreachGenerationOutput(`{"draft":"${long}"}`)).toBeNull();
  });

  test("trims whitespace before applying length bounds", () => {
    const padded = "  " + "x".repeat(OUTREACH_MIN_CHARS) + "  ";
    const r = parseOutreachGenerationOutput(`{"draft":"${padded}"}`);
    expect(r).not.toBeNull();
    expect(r!.draft).toBe("x".repeat(OUTREACH_MIN_CHARS));
  });

  test("returns null on malformed JSON / missing draft / wrong type / non-object", () => {
    expect(parseOutreachGenerationOutput("not json")).toBeNull();
    expect(parseOutreachGenerationOutput("{")).toBeNull();
    expect(parseOutreachGenerationOutput(`{"rationale":"no draft"}`)).toBeNull();
    expect(parseOutreachGenerationOutput(`{"draft":123}`)).toBeNull();
    expect(parseOutreachGenerationOutput(`["${validDraft}"]`)).toBeNull();
    expect(parseOutreachGenerationOutput("")).toBeNull();
  });
});

describe("parseOutreachCritiqueOutput", () => {
  test("parses clean JSON", () => {
    const r = parseOutreachCritiqueOutput(`{"score":8,"feedback":"挺自然"}`);
    expect(r).toEqual({ score: 8, feedback: "挺自然" });
  });

  test("strips fences", () => {
    expect(parseOutreachCritiqueOutput("```json\n" + `{"score":5,"feedback":"x"}` + "\n```")).toEqual(
      { score: 5, feedback: "x" }
    );
  });

  test("clamps score above 10 down to 10 and below 0 up to 0", () => {
    expect(parseOutreachCritiqueOutput(`{"score":15,"feedback":"x"}`)!.score).toBe(10);
    expect(parseOutreachCritiqueOutput(`{"score":-4,"feedback":"x"}`)!.score).toBe(0);
  });

  test("keeps in-range fractional scores", () => {
    expect(parseOutreachCritiqueOutput(`{"score":7.5,"feedback":"x"}`)!.score).toBe(7.5);
  });

  test("returns null on missing/wrong-typed fields, non-object, malformed", () => {
    expect(parseOutreachCritiqueOutput(`{"score":8}`)).toBeNull();
    expect(parseOutreachCritiqueOutput(`{"feedback":"x"}`)).toBeNull();
    expect(parseOutreachCritiqueOutput(`{"score":"8","feedback":"x"}`)).toBeNull();
    expect(parseOutreachCritiqueOutput("garbage")).toBeNull();
    expect(parseOutreachCritiqueOutput("")).toBeNull();
  });
});

describe("parseRelevanceFilterOutput", () => {
  test("parses clean JSON", () => {
    expect(parseRelevanceFilterOutput(`{"score":9,"reason":"高度相关"}`)).toEqual({
      score: 9,
      reason: "高度相关",
    });
  });

  test("strips fences", () => {
    expect(parseRelevanceFilterOutput("```json\n" + `{"score":3,"reason":"弱"}` + "\n```")).toEqual({
      score: 3,
      reason: "弱",
    });
  });

  test("clamps out-of-range scores into [0,10]", () => {
    expect(parseRelevanceFilterOutput(`{"score":99,"reason":"x"}`)!.score).toBe(10);
    expect(parseRelevanceFilterOutput(`{"score":-1,"reason":"x"}`)!.score).toBe(0);
  });

  test("returns null on missing/wrong-typed fields, non-object, malformed", () => {
    expect(parseRelevanceFilterOutput(`{"score":5}`)).toBeNull();
    expect(parseRelevanceFilterOutput(`{"reason":"x"}`)).toBeNull();
    expect(parseRelevanceFilterOutput(`{"score":null,"reason":"x"}`)).toBeNull();
    expect(parseRelevanceFilterOutput("not json")).toBeNull();
    expect(parseRelevanceFilterOutput("")).toBeNull();
  });
});
