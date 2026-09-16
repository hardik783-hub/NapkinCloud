# Project State — NapkinCloud

## Current Position
**Phase:** 4 — End-to-End Reliability & Demo Polish  
**Status:** Ready to plan  
**Last activity:** 2026-09-16 — Phase 3 execution completed and verified  

## Completed Phases
- **Phase 1: Canvas & Graph Representation** (3 plans executed, verified with `npm run build`)
- **Phase 2: AI Reasoning & Deterministic Compiler** (3 plans executed, verified with `npm run build`)
- **Phase 3: Interactive Drawers & Live Testing** (3 plans executed, verified with `npm run build`)
  - Node deployment progression (`draft` -> `compiling` -> `deploying` -> `🟢 live`).
  - Slide-out API Tester drawer (`src/components/canvas/drawers/ApiTesterDrawer.tsx` & `/api/test`).
  - Slide-out DynamoDB Inspector drawer (`src/components/canvas/drawers/DynamoDbDrawer.tsx` & `/api/data`).
  - Real-time event synchronization between API requests and database items.

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |
| Dual Bedrock / Rule Fallback Engine | Phase 2 | Implementation | Guarantees zero-fail demo on camera regardless of AWS quota |
| In-Canvas Drawers with Live Sync | Phase 3 | Implementation | Instant gratification: firing an API request updates DynamoDB row live |

### Blockers/Concerns
- Ready for Phase 4: Final verification, Dev Server launch test, and demo storyboard rehearsal.

---
*Last updated: 2026-09-16*
