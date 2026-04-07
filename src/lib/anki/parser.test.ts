import { describe, it, expect } from "vitest";
import { parseAnkiTxt } from "./parser";

const SAMPLE_INPUT = `#separator:tab
#html:true
#guid column:1
#notetype column:2
#deck column:3
#tags column:6
abc123\tBasic\tMA1::Geschichte\tWhat is <b>HTTP</b>?\tHyperText Transfer Protocol\ttag1 tag2
def456\tBasic\tMA1::Geschichte\tWhat does &quot;HTML&quot; stand for?\tHyperText Markup Language\ttag3
abc123\tBasic\tMA1::Geschichte\tDuplicate guid\tShould be skipped\t`;

describe("Anki TXT parser", () => {
  it("parses header-delimited tab-separated cards", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards).toHaveLength(2); // 3rd row deduped on guid
  });

  it("extracts deck name from first segment of :: path", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.deckName).toBe("MA1");
  });

  it("extracts front/back from field columns (not metadata columns)", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards[0].front).toContain("<b>HTTP</b>");
    expect(result.cards[0].back).toBe("HyperText Transfer Protocol");
  });

  it("decodes HTML entities like &quot;", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards[1].front).toContain('"HTML"');
  });

  it("parses space-separated tags", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards[0].tags).toEqual(["tag1", "tag2"]);
    expect(result.cards[1].tags).toEqual(["tag3"]);
  });

  it("sets isHtml from header", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards[0].isHtml).toBe(true);
  });

  it("stores guid and notetype", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    expect(result.cards[0].guid).toBe("abc123");
    expect(result.cards[0].notetype).toBe("Basic");
  });

  it("deduplicates on guid", () => {
    const result = parseAnkiTxt(SAMPLE_INPUT);
    const guids = result.cards.map((c) => c.guid);
    expect(guids).toEqual(["abc123", "def456"]);
  });

  it("handles comma separator", () => {
    const input = `#separator:comma
#html:false
Hello,World`;
    const result = parseAnkiTxt(input);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toBe("Hello");
    expect(result.cards[0].back).toBe("World");
    expect(result.cards[0].isHtml).toBe(false);
  });

  it("handles no header lines", () => {
    const input = `front1\tback1
front2\tback2`;
    const result = parseAnkiTxt(input);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].front).toBe("front1");
    expect(result.cards[1].back).toBe("back2");
  });
});
