## Declutter Agent Orchestration Guide

This guide tailors your orchestration patterns to the Declutter MVP, your codebase, and the agents in `.claude/agents/`. Use this as the lightweight playbook to consistently ship production-ready features fast.

### Available Agents (and when to use)

- **react-mobile-ui-builder** (UI implementation)
  - Build or modify React components/pages with Tailwind, mobile-first UIs, camera/photo capture, forms, tables, loading/empty/error states.
- **browser-storage-specialist** (image + storage)
  - Image compression/thumbnailing, Blob URL lifecycle, IndexedDB/Dexie schema and storage quota work.
- **state-data-operations** (data + business logic)
  - Dexie CRUD, dashboard aggregations, CSV export shaping/sanitization, data validations, performance of large datasets.
- **gemini-api-specialist** (AI integration)
  - Gemini SDK config, structured outputs, Japanese prompt tuning, API route behavior, error handling and cost/perf tuning.
- **japan-market-compliance** (market fit)
  - Validate JP copy, currency/formatting, disposal fee logic, marketplace recommendations, municipality considerations.
- **fullstack-code-reviewer** (final review)
  - Post-implementation audit across React/TypeScript/Next.js for consistency, DRY, perf, accessibility, and security basics.

### Core Orchestration Patterns

1. Sequential Implementation (most common)

- Plan → Implement → Review → Polish
  - react-mobile-ui-builder: UI/component/page
  - browser-storage-specialist or state-data-operations: storage/data logic (as needed)
  - gemini-api-specialist: API/Gemini pieces (as needed)
  - japan-market-compliance: JP-specific review
  - fullstack-code-reviewer: production-readiness check

2. Parallel Execution (when independent)

- In parallel:
  - react-mobile-ui-builder: component A (e.g., table)
  - browser-storage-specialist: image utils/storage
  - state-data-operations: CSV export pipeline
- Then: fullstack-code-reviewer → quick fix pass

3. Iterative Refinement (tight loop)

- Implement (react-mobile-ui-builder / data agents) → quick manual validation → adjust → reviewer. Repeat until AC met.

4. Debug–Fix–Verify

- Identify issue → assign to the appropriate specialist (storage/data/UI/API) → verify fix → reviewer.

5. Sprint Task Completion (board-driven)

- For each task: skim scope → pick agent(s) → implement → reviewer → update `docs/01_app_tasks.md`.

### Quality Gates (use repo scripts)

- TypeScript: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`

All three should pass before calling a feature “done” for this MVP. Tests are out-of-scope now; do a quick manual UX check instead.

### Documentation Protocol (lightweight)

- After meaningful work, add a brief summary in `docs/temp/`:
  - Filename: `agent_[YYYYMMDD_HHMMSS]_[agent-name]_[task].md`
  - Content: task overview, key decisions, assumptions, any blockers, validation status.

### Blocker Escalation (MVP-appropriate)

- Security/PII concerns, data loss risks, or architectural conflicts: stop and surface options with pros/cons.
- Design ambiguities: propose 2–3 options with a recommendation; proceed with the default if no response within the sprint day.

### Project-Flavored Playbooks

- Capture Page (`/capture`)
  - react-mobile-ui-builder: page shell + integrate `PhotoCapture` (now uses `onPhotoCapture(photo, thumbnail, quality, originalFile?)`)
  - browser-storage-specialist: quota checks, image compression/thumbnail handling
  - gemini-api-specialist: POST `/api/analyze` request shaping, error states
  - state-data-operations: persist analyzed result via Dexie helpers
  - japan-market-compliance: JP copy, pricing/wording appropriateness
  - fullstack-code-reviewer: final pass; run quality gates

- Dashboard (`/dashboard`)
  - state-data-operations: `calculateDashboardSummary`, export shaping
  - react-mobile-ui-builder: integrate `DashboardSummary` + `ItemsTable`, responsive layouts
  - browser-storage-specialist: thumbnail Blob URL lifecycle checks in list
  - fullstack-code-reviewer: review filters/sorting/pagination for perf

- Edit Page (`/edit/[id]`)
  - react-mobile-ui-builder: mount `ItemForm`, route handling
  - state-data-operations: CRUD integration, validation flows
  - fullstack-code-reviewer: confirm form validation + DX

- CSV Export (Feature)
  - state-data-operations: export shaping + CSV injection sanitization
  - react-mobile-ui-builder: export UI (selected/all), feedback states
  - fullstack-code-reviewer: check encoding/format and safety

- Municipality Integration (Feature)
  - state-data-operations: selected municipality persistence, item enrichment
  - japan-market-compliance: disposal fee notes/links; copy tone
  - react-mobile-ui-builder: surfaces links/context in UI

### Minimal Acceptance Criteria (per feature)

- UX: Mobile-first, clear loading/empty/error states, JP copy consistent.
- Data: Dexie operations succeed; no Blob URL leaks.
- AI: `/api/analyze` returns structured data; errors are user-friendly.
- Perf: Debounced searches; avoid unnecessary re-renders.
- Gates: typecheck + lint + build all pass.

### Agent Invocation Hints

- Storage/image issues → browser-storage-specialist
- CRUD, aggregations, CSV sanitization → state-data-operations
- Gemini prompt/schema/API → gemini-api-specialist
- UI refactors or new components/pages → react-mobile-ui-builder
- JP market/copy/formatting → japan-market-compliance
- Final polish/consistency → fullstack-code-reviewer

### Communication Templates (trimmed)

- Progress update
  - Completed: [AGENT] – [What]
  - In progress: [AGENT] – [What]
  - Next: [AGENT] – [What]
  - Quality: typecheck ✅/❌, lint ✅/❌, build ✅/❌

- Handoff note
  - Context: [What changed]
  - Decisions: [Key items]
  - Risks/Assumptions: [List]
  - Where to look: [Files/paths]

### Quick Commands

```bash
npm run typecheck
npm run lint
npm run build
```

Keep this doc pragmatic and updated as we add pages (`/dashboard`, `/capture`, `/edit/[id]`) and features (CSV export, municipality integration). If you add new agents, extend “Available Agents” and playbooks accordingly.
