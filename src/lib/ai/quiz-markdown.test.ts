import { describe, expect, it } from "vitest";
import { parseQuizMarkdown } from "@/lib/ai/quiz-markdown";
import { validateGeneratedQuestions } from "@/lib/ai/quiz-schema";

const mc = (n = 1) => `## QUESTION ${n}\nType: multiple_choice\nDifficulty: easy\nConcepts: ตัวแปร, การเขียนโปรแกรม\n\n### Question\nตัวแปรในภาษา C ใช้ทำอะไร?\n\n### Options\nA. เก็บค่าข้อมูล\nB. แสดงผลรูปภาพ\nC. เชื่อมต่อเครือข่าย\nD. ปิดโปรแกรม\n\n### Answer\nA\n\n### Explanation\nตัวแปรใช้เก็บค่าข้อมูลในหน่วยความจำ\n\n### Source\n> ตัวแปรใช้เก็บค่าข้อมูลที่เปลี่ยนแปลงได้ระหว่างโปรแกรมทำงาน`;
const tf = `## QUESTION 1\nType: true_false\nDifficulty: medium\nConcepts: ระบบเลขฐานสอง\n\n### Question\nเลขฐานสองประกอบด้วยตัวเลข 0 และ 1 เท่านั้น\n\n### Answer\ntrue\n\n### Explanation\nระบบเลขฐานสองใช้ตัวเลขเพียงสองตัวคือ 0 และ 1\n\n### Source\n> ระบบเลขฐานสองประกอบด้วยเลข 0 และ 1`;

describe("quiz Markdown parser", () => {
  it("parses Thai multiple-choice and preserves source wording", () => {
    const parsed = parseQuizMarkdown(mc());
    expect(parsed).toMatchObject({ rejectedCount: 0, diagnostics: [] });
    expect(parsed.questions[0]).toMatchObject({ type: "multiple_choice", correctAnswer: "a", conceptKeys: ["ตัวแปร", "การเขียนโปรแกรม"], sourceReferences: [{ quote: "ตัวแปรใช้เก็บค่าข้อมูลที่เปลี่ยนแปลงได้ระหว่างโปรแกรมทำงาน" }] });
    expect(validateGeneratedQuestions({ questions: parsed.questions }, "บทเรียน ตัวแปรใช้เก็บค่าข้อมูลที่เปลี่ยนแปลงได้ระหว่างโปรแกรมทำงาน").questions).toHaveLength(1);
  });

  it("parses true/false answers into booleans and multiple blocks", () => {
    expect(parseQuizMarkdown(`${mc(1)}\n\n${tf.replace("QUESTION 1", "QUESTION 2")}`).questions).toHaveLength(2);
    expect(parseQuizMarkdown(tf).questions[0]).toMatchObject({ type: "true_false", correctAnswer: true });
  });

  it.each([
    ["duplicate option labels", mc().replace("B. แสดงผลรูปภาพ", "A. แสดงผลรูปภาพ")],
    ["missing sections", mc().replace(/### Explanation[\s\S]*?### Source/, "### Source")],
    ["invalid answer", mc().replace("### Answer\nA", "### Answer\nE")],
    ["invalid true/false answer", tf.replace("### Answer\ntrue", "### Answer\nyes")],
    ["empty citation", mc().replace("> ตัวแปรใช้เก็บค่าข้อมูลที่เปลี่ยนแปลงได้ระหว่างโปรแกรมทำงาน", ">   ")],
    ["duplicate block heading", mc().replace("### Question", "### Question\n### Question")],
  ])("rejects %s without inventing data", (_name, input) => {
    const parsed = parseQuizMarkdown(input);
    expect(parsed.questions).toHaveLength(0);
    expect(parsed.rejectedCount).toBe(1);
    expect(parsed.diagnostics).toHaveLength(1);
  });

  it("keeps complete blocks when the final Markdown block is truncated", () => {
    const parsed = parseQuizMarkdown(`${mc(1)}\n\n## QUESTION 2\nType: multiple_choice\nDifficulty: easy\n### Question\nข้อความที่ขาดส่วนที่เหลือ`);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.rejectedCount).toBe(1);
  });

  it("rejects a duplicate question block number while retaining the first block", () => {
    const parsed = parseQuizMarkdown(`${mc(1)}\n\n${mc(1).replace("ตัวแปรในภาษา C ใช้ทำอะไร?", "ภาษา C ใช้ตัวแปรอย่างไร?")}`);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.rejectedCount).toBe(1);
    expect(parsed.diagnostics).toContain("question_1_duplicate_block_number");
  });
});
