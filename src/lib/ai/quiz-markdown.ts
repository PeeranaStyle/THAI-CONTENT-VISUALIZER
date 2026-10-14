export type ParsedQuizMarkdown = {
  questions: unknown[];
  rejectedCount: number;
  diagnostics: string[];
};

const sectionNames = ["Question", "Options", "Answer", "Explanation", "Source"] as const;
type SectionName = typeof sectionNames[number];

/** Deterministically converts the quiz Markdown contract into the existing quiz payload. */
export function parseQuizMarkdown(markdown: string): ParsedQuizMarkdown {
  const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const starts: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^##\s+QUESTION\s+\d+\s*$/i.test(lines[index].trim())) starts.push(index);
  }

  if (!starts.length) return { questions: [], rejectedCount: 1, diagnostics: ["quiz_markdown_no_question_blocks"] };
  const questions: unknown[] = [];
  const diagnostics: string[] = [];
  let rejectedCount = 0;
  const seenNumbers = new Set<string>();

  for (let blockIndex = 0; blockIndex < starts.length; blockIndex += 1) {
    const start = starts[blockIndex];
    const end = starts[blockIndex + 1] ?? lines.length;
    const blockNumber = /^##\s+QUESTION\s+(\d+)\s*$/i.exec(lines[start].trim())?.[1];
    if (blockNumber && seenNumbers.has(blockNumber)) {
      rejectedCount += 1;
      diagnostics.push(`question_${blockIndex}_duplicate_block_number`);
      continue;
    }
    if (blockNumber) seenNumbers.add(blockNumber);
    const block = lines.slice(start + 1, end);
    const metadata = new Map<string, string>();
    const sections = new Map<SectionName, string[]>();
    const duplicate = new Set<string>();
    let activeSection: SectionName | null = null;
    let malformed = false;

    for (const rawLine of block) {
      const line = rawLine.trimEnd();
      const heading = /^###\s+(Question|Options|Answer|Explanation|Source)\s*$/i.exec(line.trim());
      if (heading) {
        const name = sectionNames.find(item => item.toLowerCase() === heading[1].toLowerCase())!;
        if (sections.has(name)) duplicate.add(name);
        else sections.set(name, []);
        activeSection = name;
        continue;
      }
      if (/^#{1,6}\s+/.test(line.trim())) { malformed = true; continue; }
      const meta = /^(Type|Difficulty|Concepts)\s*:\s*(.*)$/i.exec(line.trim());
      if (meta && activeSection === null) {
        const key = meta[1].toLowerCase();
        if (metadata.has(key)) duplicate.add(key);
        else metadata.set(key, meta[2].trim());
        continue;
      }
      if (activeSection) sections.get(activeSection)?.push(line);
      else if (line.trim()) malformed = true;
    }

    const reason = (value: string) => { rejectedCount += 1; diagnostics.push(`question_${blockIndex}_${value}`); };
    if (malformed || duplicate.size) {
      reason(duplicate.size ? `duplicate_heading_${[...duplicate].join("_")}` : "malformed_block");
      continue;
    }
    const type = metadata.get("type");
    const difficulty = metadata.get("difficulty");
    const conceptsValue = metadata.get("concepts");
    const question = sections.get("Question")?.join("\n").trim();
    const answerText = sections.get("Answer")?.join("\n").trim();
    const explanation = sections.get("Explanation")?.join("\n").trim();
    const sourceLines = sections.get("Source") ?? [];
    const quoteLines = sourceLines.map(line => {
      const trimmed = line.trim();
      return trimmed.startsWith(">") ? trimmed.slice(1).replace(/^\s?/, "") : trimmed;
    });
    const quote = quoteLines.join("\n").trim();
    const required = ["Question", "Answer", "Explanation", "Source"];
    if (type === "multiple_choice") required.push("Options");
    const missing = required.filter(key => !sections.has(key as SectionName));
    if (!type || !["multiple_choice", "true_false"].includes(type) || !difficulty || !["easy", "medium", "hard"].includes(difficulty) || !conceptsValue || !question || !answerText || !explanation || !quote || missing.length) {
      reason(`missing_or_invalid_fields${missing.length ? `_${missing.join("_").toLowerCase()}` : ""}`);
      continue;
    }

    const concepts = conceptsValue.split(",").map(item => item.trim()).filter(Boolean);
    if (!concepts.length || concepts.length !== conceptsValue.split(",").length) {
      reason("invalid_concepts");
      continue;
    }
    const answer = answerText.toLowerCase();
    if (type === "true_false") {
      if (answer !== "true" && answer !== "false") { reason("invalid_true_false_answer"); continue; }
      questions.push({ type, difficulty, conceptKeys: concepts, question, correctAnswer: answer === "true", explanation, sourceReferences: [{ quote }] });
      continue;
    }

    const options: Array<{ id: string; text: string }> = [];
    let invalidOption = false;
    for (const optionLine of sections.get("Options") ?? []) {
      if (!optionLine.trim()) continue;
      const match = /^\s*([A-D])\.\s+(.+?)\s*$/.exec(optionLine);
      if (!match) { invalidOption = true; break; }
      const id = match[1].toLowerCase();
      if (options.some(option => option.id === id)) { invalidOption = true; break; }
      options.push({ id, text: match[2].trim() });
    }
    if (invalidOption || options.length !== 4 || new Set(options.map(option => option.id)).size !== 4) { reason("invalid_or_duplicate_options"); continue; }
    if (!/^[A-D]$/i.test(answerText)) { reason("invalid_multiple_choice_answer"); continue; }
    questions.push({ type, difficulty, conceptKeys: concepts, question, options, correctAnswer: answer, explanation, sourceReferences: [{ quote }] });
  }

  return { questions, rejectedCount, diagnostics };
}
