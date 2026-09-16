# Roadmap — NapkinCloud (Fullstack & AI Scope)

## Milestone 1: Hackathon MVP (P0 Core Loop)

### Progress

| Phase | Name | Status | Plans | Target Date |
|-------|------|--------|-------|-------------|
| 1 | Canvas & Graph Representation | Complete ✓ | 3/3 | 2026-09-16 |
| 2 | AI Reasoning & Deterministic Compiler | Complete ✓ | 3/3 | 2026-09-16 |
| 3 | Interactive Drawers & Live Testing | Planned | — | Sept 19, 2026 |
| 4 | End-to-End Reliability & Demo Polish | Planned | — | Sept 20, 2026 |

---

### Phases

#### Phase 1: Canvas & Graph Representation
**Goal:** Build a dark-mode interactive React Flow canvas where a user can assemble `API Gateway` ⟶ `Lambda` ⟶ `DynamoDB` with custom labels/annotations and export strict Graph JSON.  
**Requirements:** R01, R02, R03, R04  
- [x] Initialize Next.js project with Tailwind CSS and `@xyflow/react` (Plan 01-01)
- [x] Implement custom node components for API Gateway, Lambda, and DynamoDB (Plan 01-02)
- [x] Implement edge connections with visual port validation (Plan 01-02)
- [x] Add sidebar with draggable components (Plan 01-03)
- [x] Implement Graph JSON export function (Plan 01-03)

#### Phase 2: AI Reasoning & Deterministic Compiler
**Goal:** Build the backend pipeline that validates the graph, normalizes intent with Amazon Bedrock (Claude 3.5 Sonnet), and deterministically generates tested `template.yaml` and `handler.js`.  
**Requirements:** R05, R06, R07, R08, R09  
- [x] Implement topology validator to enforce P0 architecture (Plan 02-01)
- [x] Integrate Bedrock API client with strict structured JSON schema (Plan 02-01)
- [x] Build deterministic SAM compiler with slot-injection for API routes, Lambda, and DynamoDB (Plan 02-02)
- [x] Build Lambda handler code synthesizer pre-wired to DynamoDB DocumentClient (Plan 02-02)
- [x] Implement fallback template injection for offline/zero-fail guarantee (Plan 02-02)
- [x] Connect Next.js `/api/compile` route with modal & canvas trigger (Plan 02-03)

#### Phase 3: Interactive Drawers & Live Testing
**Goal:** Turn the canvas into an active control surface once deployed, featuring live node statuses, the slide-out API tester drawer, and the live DynamoDB inspector.  
**Requirements:** R10, R11, R12  
- [ ] Implement dynamic node visual states (`compiling`, `deploying`, `🟢 live`, `🔴 failed`)
- [ ] Build API tester drawer with editable JSON request body, send trigger, and response viewer
- [ ] Build DynamoDB inspector drawer with live table rendering
- [ ] Integrate CORS handling and backend proxy routes (`/api/test`, `/api/data`)

#### Phase 4: End-to-End Reliability & Demo Polish
**Goal:** Run end-to-end integration with teammate's AWS deployment, eliminate UI quirks, test fallback modes, and record the 3-minute video.  
**Requirements:** All V1 requirements verified  
- [ ] Perform cross-machine verification of the 9-step Definition of Done
- [ ] Polish UI transitions, loading states, and status badges
- [ ] Verify error states and edge cases
- [ ] Record the 3-minute demo video matching the storyboard

---
*Last updated: 2026-09-16*
