# Thai Content Visualizer

For work on the product UI, follow this sequence:

1. **Design research:** Read and apply `.agents/skills/frontend-design/SKILL.md`. Begin with the product's learning context, audience, and user tasks. Produce a short, distinct design proposal before implementation and check it against the brief.
2. **Design system:** Establish named color tokens, Thai and Latin type choices, type scale, spacing, component states, focus styles, responsive rules, and light/dark behavior. Keep Thai reading comfort and accessible contrast central.
3. **UX architecture:** Map navigation and learning workflows before building screens. Specify knowledge graph navigation, selection, zoom, filtering, keyboard interaction, and mobile behavior where relevant.
4. **Implementation:** Apply the selected project's framework conventions. For React work, read and apply `.agents/skills/react-best-practices/SKILL.md` and the relevant rule files; do not apply Next.js-specific guidance unless the project uses Next.js.
5. **Visual verification:** When a runnable UI exists, use `.agents/skills/playwright/SKILL.md` to inspect real pages and capture desktop and mobile screenshots. Its wrapper is project-local at `.agents/skills/playwright/scripts/playwright_cli.sh`; run it from a Bash-compatible shell and check for `npx` first. Keep captured artifacts under `output/playwright/`.
6. **Design refinement:** Before calling UI work complete, read `.agents/skills/web-design-guidelines/SKILL.md`, fetch the current linked guidelines, review the changed UI, and correct visual, responsive, accessibility, and interaction defects found in screenshots and review.

Visual direction: create a premium educational workspace for Thai learners and educators. Use a readable Thai type system, calm academic blue with warm white and restrained indigo or pastel accents, clear hierarchy, purposeful learning cards, and expressive knowledge graph nodes. Support light and dark modes, keyboard access, reduced motion, and small screens. Avoid generic analytics-dashboard layouts, decorative gradients, gratuitous glass effects, childish imagery, and interchangeable components. Let subject matter and learning tasks shape each screen.

Invoke the relevant skill for its phase instead of treating this file as a substitute for its detailed workflow. Keep product language clear and natural in Thai and English. Do not begin product implementation before the design proposal and UX structure are established.
