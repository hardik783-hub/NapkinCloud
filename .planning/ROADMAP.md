# Roadmap — NapkinCloud (Fullstack & AI Scope)

## Milestone 1: Hackathon MVP (P0 Core Loop)

### Progress

| Phase | Name | Status | Plans | Target Date |
|-------|------|--------|-------|-------------|
| 1 | Canvas & Graph Representation | Complete ✓ | 3/3 | 2026-09-16 |
| 2 | AI Reasoning & Deterministic Compiler | Complete ✓ | 3/3 | 2026-09-16 |
| 3 | Interactive Drawers & Live Testing | Complete ✓ | 3/3 | 2026-09-16 |
| 4 | End-to-End Reliability & Demo Polish | Complete ✓ | 2/2 | 2026-09-16 |
| 5 | Natural Language Architecture & AI Reasoning | Complete ✓ | 1/1 | 2026-09-16 |

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
- [x] Implement dynamic node visual states (`compiling`, `deploying`, `🟢 live`, `🔴 failed`) (Plan 03-01)
- [x] Build API tester drawer with editable JSON request body, send trigger, and response viewer (Plan 03-02)
- [x] Build DynamoDB inspector drawer with live table rendering (Plan 03-03)
- [x] Integrate CORS handling and backend proxy routes (`/api/test`, `/api/data`) (Plan 03-02, 03-03)

#### Phase 4: End-to-End Reliability & Demo Polish
**Goal:** Run end-to-end integration with teammate's AWS deployment, eliminate UI quirks, test fallback modes, and record the 3-minute video.  
**Requirements:** All V1 requirements verified  
- [x] Perform cross-machine verification of the 9-step Definition of Done (Plan 04-01)
- [x] Add floating Demo Rehearsal HUD with reset & instant live triggers (Plan 04-02)
- [x] Polish UI transitions, loading states, and status badges (Plan 04-02)
- [x] Create comprehensive production README with architecture diagram (Plan 04-02)

#### Phase 5: Natural Language Architecture & AI Reasoning
**Goal:** Integrate teammate's schema and "Prompt-to-Architecture" idea, allowing users to type natural language descriptions that auto-populate canvas nodes, display AI service reasoning, and export unified team schemas.  
**Requirements:** R05, R06, R07, R08, R09  
- [x] Implement Bedrock Architecture Generator & Fallback Engine (Plan 05-01)
- [x] Implement PromptBar UI with instant quick-picks (Plan 05-01)
- [x] Add AI Reasoning Card in Compilation Modal & Harmonized JSON Exporter (Plan 05-01)

---
*Last updated: 2026-09-16 — Phase 5 Complete ✓*
