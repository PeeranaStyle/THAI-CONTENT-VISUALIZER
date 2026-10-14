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
});
