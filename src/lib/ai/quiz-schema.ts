import { z } from "zod";

const difficulty = z.enum(["easy", "medium", "hard"]);
const shared = {
  question: z.string().trim().min(12).max(700),
  explanation: z.string().trim().min(12).max(1200),
  difficulty,
  conceptKeys: z.array(z.string().trim().min(1).max(64)).min(1).max(8),
  sourceReferences: z.array(z.object({ quote: z.string().trim().min(12).max(600), page: z.number().int().positive().optional() })).min(1).max(4),
};

export const multipleChoiceQuestionSchema = z.object({
  type: z.literal("multiple_choice"),
  ...shared,
  options: z.array(z.object({ id: z.enum(["a", "b", "c", "d"]), text: z.string().trim().min(1).max(400) })).length(4),
  correctAnswer: z.enum(["a", "b", "c", "d"]),
}).superRefine((question, context) => {
  const ids = new Set(question.options.map(option => option.id));
  const texts = question.options.map(option => normalizeText(option.text));
  if (ids.size !== 4) context.addIssue({ code: "custom", path: ["options"], message: "option_ids_not_unique" });
  if (new Set(texts).size !== 4) context.addIssue({ code: "custom", path: ["options"], message: "option_texts_not_distinct" });
  if (!ids.has(question.correctAnswer)) context.addIssue({ code: "custom", path: ["correctAnswer"], message: "correct_answer_option_missing" });
});

export const trueFalseQuestionSchema = z.object({
  type: z.literal("true_false"),
  ...shared,
  options: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  correctAnswer: z.boolean(),
});

export const generatedQuestionSchema = z.discriminatedUnion("type", [multipleChoiceQuestionSchema, trueFalseQuestionSchema]);
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generatedQuizPayloadSchema = z.object({ questions: z.array(z.unknown()).min(1).max(40) });

export function normalizeText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("th-TH").replace(/[\s\p{P}\p{S}]+/gu, "").trim();
}

export function validateGeneratedQuestions(
  payload: unknown,
  sourceText: string,
  options: { existingQuestions?: readonly GeneratedQuestion[]; expectedType?: "multiple_choice" | "true_false" } = {},
) {
  const envelope = generatedQuizPayloadSchema.safeParse(payload);
  if (!envelope.success) return { questions: [] as GeneratedQuestion[], rejectedCount: 0, diagnostics: ["quiz_payload_invalid"], error: "AI response did not contain a usable question list." };
  const source = normalizeText(sourceText);
  const seen = new Set((options.existingQuestions ?? []).map(question => normalizeText(question.question)));
  const questions: GeneratedQuestion[] = [];
  const diagnostics: string[] = [];
  let rejectedCount = 0;
  for (const [index, candidate] of envelope.data.questions.entries()) {
    const parsed = generatedQuestionSchema.safeParse(candidate);
    if (!parsed.success) {
      rejectedCount += 1;
      diagnostics.push(...parsed.error.issues.slice(0, 4).map(issue => {
        const path = issue.path.map(String).join("_") || "root";
        return issue.code === "custom" ? `question_${index}_${path}_${issue.message}` : `question_${index}_schema_${path}_${issue.code}`;
      }));
      continue;
    }
    const question = parsed.data;
    const key = normalizeText(question.question);
    if (options.expectedType && question.type !== options.expectedType) {
      rejectedCount += 1;
      diagnostics.push(`question_${index}_question_type_mismatch`);
      continue;
    }
    const grounded = question.sourceReferences.every(reference => source.includes(normalizeText(reference.quote)));
    if (!grounded || seen.has(key)) {
      rejectedCount += 1;
      diagnostics.push(!grounded ? `question_${index}_citation_not_found` : `question_${index}_duplicate`);
      continue;
    }
    seen.add(key);
    questions.push(question);
  }
  return { questions, rejectedCount, diagnostics, error: questions.length ? undefined : "No valid source-grounded questions were returned." };
}
