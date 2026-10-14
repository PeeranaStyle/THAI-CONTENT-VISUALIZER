# Implementation plan

## Design proposal

**Product idea:** a quiet learning studio where students can move from source material to connected concepts and then practice recall. Use a “pathway” motif: a fine blue line that branches between subject, concept, and quiz rather than repeating generic metric cards.

**Palette:** Ink Blue `#193B59` (navigation and titles), Chalk `#FAF9F5` (reading canvas), Mist `#E8F2F7` (learning surfaces), Signal Blue `#3C6BCE` (actions and graph focus), Leaf `#A7C9B0` (steady progress), and Iris `#B8AFE4` (concept exploration). Coral `#E89C7C` is reserved for review-needed moments. Semantic status uses text and icons as well as color.

**Typography:** Noto Sans Thai for Thai and mixed-language interface text, with system fallbacks. Use 1.65 body line-height for Thai, a compact scale for controls, and larger, restrained headings. Keep long lesson text around 68 characters per line.

**Layout:** Desktop has a narrow ink-blue workspace rail, a quiet top context row, then a varied two-column learning workspace. The hero names the next learning action, while a small pathway preview visualizes the move from a lesson into its concepts. The library favors a readable list with subject markers rather than a wall of identical cards. Mobile uses a top title bar, stacked content, and bottom navigation; graph tools collapse into a touch-friendly toolbar and detail sheet.

```text
Desktop: [rail] [context + greeting                         profile]
                 [next learning action     | concept pathway]
                 [materials list           | recent practice ]
Mobile:  [title / account]
         [next learning action]
         [pathway preview]
         [recent learning]
         [bottom navigation]
```

**Principles:** clarity before decoration; real learner language in Thai; one memorable pathway motif; different layouts for different learning tasks; keyboard, reduced-motion, contrast, and touch access built into components.

## Milestones

1. Design system, app shell, package setup, project documentation, Supabase schema, environment contracts.
2. Custom authentication, protected routing, material creation, text and PDF upload, private storage.
3. IntelSphere client and validated AI quiz generation, persisted quiz setup.
4. Attempt player, server-side scoring, results, topic mastery, recommendations.
5. Knowledge graphs and targeted node quizzes.
6. Notes, dashboard/library/analytics/history/profile/settings completion.
7. Responsive, accessibility, security, production-build, browser and integration verification.

## External prerequisites

No Supabase or IntelSphere settings were present in the workspace environment when implementation began. The application will use documented `.env.local` settings and provide an explicit setup check; integration claims will remain unverified until valid credentials and a configured Supabase project are available.
