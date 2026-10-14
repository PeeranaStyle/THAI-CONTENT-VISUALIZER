import { describe, expect, it } from "vitest";
import { validateGeneratedQuestions } from "@/lib/ai/quiz-schema";

const groundedQuestion = {
  type: "multiple_choice",
  question: "ข้อใดอธิบายการสังเคราะห์ด้วยแสงได้ถูกต้อง?",
  explanation: "พืชใช้พลังงานแสงเปลี่ยนน้ำและคาร์บอนไดออกไซด์เป็นอาหาร",
  difficulty: "easy",
  conceptKeys: ["photosynthesis"],
  sourceReferences: [{ quote: "พืชใช้พลังงานแสงในการสร้างอาหาร" }],
  options: [{ id: "a", text: "พืชใช้พลังงานแสง" }, { id: "b", text: "พืชใช้เสียง" }, { id: "c", text: "พืชไม่สร้างอาหาร" }, { id: "d", text: "พืชใช้โลหะ" }],
  correctAnswer: "a",
};

describe("generated question validation", () => {
  it("keeps source-grounded questions and rejects unsupported citations", () => {
    const result = validateGeneratedQuestions({ questions: [groundedQuestion, { ...groundedQuestion, question: "คำถามใหม่เกี่ยวกับพลังงานแสงมีอะไรบ้าง?", sourceReferences: [{ quote: "ข้อความที่ไม่ได้อยู่ในบทเรียนต้นทาง" }] }] }, "พืชใช้พลังงานแสงในการสร้างอาหาร");
    expect(result.questions).toHaveLength(1);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects duplicate questions and duplicate answer options", () => {
    const duplicate = validateGeneratedQuestions({ questions: [groundedQuestion, groundedQuestion] }, "พืชใช้พลังงานแสงในการสร้างอาหาร");
    expect(duplicate.questions).toHaveLength(1);
    const invalidOptions = validateGeneratedQuestions({ questions: [{ ...groundedQuestion, options: groundedQuestion.options.map(option => ({ ...option, text: "คำตอบซ้ำกัน" })) }] }, "พืชใช้พลังงานแสงในการสร้างอาหาร");
    expect(invalidOptions.questions).toHaveLength(0);
  });

  it("reports stable option IDs, normalized text, and correct-answer reference diagnostics", () => {
    const duplicateIds = validateGeneratedQuestions({ questions: [{
      ...groundedQuestion,
      options: [{ id: "a", text: "First answer" }, { id: "a", text: "Second answer" }, { id: "c", text: "Third answer" }, { id: "d", text: "Fourth answer" }],
      correctAnswer: "a",
    }] }, "เธเธทเธเนเธเนเธเธฅเธฑเธเธเธฒเธเนเธชเธเนเธเธเธฒเธฃเธชเธฃเนเธฒเธเธญเธฒเธซเธฒเธฃ");
    expect(duplicateIds.diagnostics).toContain("question_0_options_option_ids_not_unique");

    const duplicateTexts = validateGeneratedQuestions({ questions: [{
      ...groundedQuestion,
      options: [{ id: "a", text: "Solar power" }, { id: "b", text: "solar-power!" }, { id: "c", text: "Wind power" }, { id: "d", text: "Hydro power" }],
    }] }, "เธเธทเธเนเธเนเธเธฅเธฑเธเธเธฒเธเนเธชเธเนเธเธเธฒเธฃเธชเธฃเนเธฒเธเธญเธฒเธซเธฒเธฃ");
    expect(duplicateTexts.diagnostics).toContain("question_0_options_option_texts_not_distinct");

    const missingAnswer = validateGeneratedQuestions({ questions: [{
      ...groundedQuestion,
      options: [{ id: "a", text: "First answer" }, { id: "b", text: "Second answer" }, { id: "c", text: "Third answer" }, { id: "c", text: "Fourth answer" }],
      correctAnswer: "d",
    }] }, "เธเธทเธเนเธเนเธเธฅเธฑเธเธเธฒเธเนเธชเธเนเธเธเธฒเธฃเธชเธฃเนเธฒเธเธญเธฒเธซเธฒเธฃ");
    expect(missingAnswer.diagnostics).toContain("question_0_correctAnswer_correct_answer_option_missing");
  });
});
