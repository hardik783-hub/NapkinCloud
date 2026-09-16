# Project State — NapkinCloud

## Current Position
**Phase:** 2 — AI Reasoning & Deterministic Compiler  
**Status:** Ready to execute  
**Last activity:** 2026-09-16 — Phase 2 planned (3 task plans created)  

## Plans Summary (Phase 2)
- `02-01`: Graph Topology Validator & Bedrock Intent Normalizer (R05, R06)
- `02-02`: Deterministic SAM Compiler & Lambda Synthesizer (R07, R08, R09)
- `02-03`: Compilation API Route & Canvas Hand-Off Integration (All Phase 2)

## Completed Phases
- **Phase 1: Canvas & Graph Representation** (3 plans executed, verified with `npm run build`)

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |
| Dual Bedrock / Rule Fallback Engine | Phase 2 | Planning | Guarantees zero-fail demo on camera regardless of AWS quota |

### Blockers/Concerns
- Bedrock runtime SDK `@aws-sdk/client-bedrock-runtime` installed; fallback engine ensures local builds work with or without AWS keys.

---
*Last updated: 2026-09-16*
