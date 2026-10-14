# MindMap AI interface direction

## Product and workflow

MindMap AI supports Thai learners and educators who want to turn lesson material into a clearer mental model, practice questions, and a useful next step. The main route is **add a lesson → explore its knowledge graph → practice a quiz → review topic results**. The dashboard exposes lesson creation, quiz creation, and graph access near the top of the page.

## Visual system

- **Ink navy** `#18344b` for headings and navigation; **deep navy** `#142b3e` for inverse surfaces.
- **Cool paper** `#f3f6f7`, **white surface** `#ffffff`, and **blue mist** `#e8f0f5` establish readable layers.
- **Study blue** `#315fc2` is the primary light-theme action; violet, leaf, and warm gold identify supporting learning states.
- **Dark surfaces** use `#101d29`, `#172938`, and `#192d3c` in layers. Accents and action labels have separate contrast values for dark mode.
- **Noto Sans Thai Variable** serves Thai and Latin text. Headings use a restrained scale, balanced wrapping, and generous Thai line height.
- Cards use a small radius scale, fine borders, and minimal shadow. The learning graph is the main visual illustration because it represents the product's central task.

## Page composition and interaction

- Landing: concise Thai headline and paired actions, followed by a real graph-style preview, four learning steps, focused features, and a final sign-up action.
- Workspace: persistent desktop learning navigation and a five-destination mobile bar. The dashboard foregrounds the three next actions and then shows saved materials, mastery, and recent activity.
- Knowledge graph: retain the existing interactive React Flow canvas, node selection, detail panel, and graph actions; use the shared surface, type, and focus tokens.
- Quiz and results: retain the existing question, progress, answer, scoring, topic, and review flows while sharing the global color and typography system.
- Theme selection stays in local storage on public pages. Signed-in workspace changes also save to the user's settings endpoint.

## Skills applied

- `frontend-design`: defined the learning-specific visual direction, palette, typography, landing composition, and focused use of the graph as the product visual.
- `vercel-react-best-practices`: kept the theme toggle's server persistence conditional so public pages do not issue an unauthenticated settings request.
- `playwright`: opened the production build, inspected light and dark screenshots at desktop and mobile sizes, checked horizontal overflow, and reviewed the browser console.
- `web-design-guidelines`: reviewed accessible labels, focus styles, button contrast, heading hierarchy, copy, and mobile layout.

## Verification scope

Production build, typecheck, and lint pass. Playwright captures cover the landing page at desktop and mobile sizes in both themes, plus the registration screen. Authenticated workspace routes require configured Supabase credentials; they could not be opened in this local environment.
