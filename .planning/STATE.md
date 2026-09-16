# Project State — NapkinCloud

## Current Position
**Phase:** 3 — Interactive Drawers & Live Testing  
**Status:** Ready to plan  
**Last activity:** 2026-09-16 — Phase 2 execution completed and verified  

## Completed Phases
- **Phase 1: Canvas & Graph Representation** (3 plans executed, verified with `npm run build`)
- **Phase 2: AI Reasoning & Deterministic Compiler** (3 plans executed, verified with `npm run build`)
  - Topology validator (`src/lib/validator.ts`).
  - Amazon Bedrock intent normalizer with offline rule fallback (`src/lib/bedrock.ts`).
  - Deterministic SAM YAML compiler (`src/lib/compiler.ts`).
  - Production-grade Node.js 20.x Lambda handler generator (`src/lib/lambdaSynthesizer.ts`).
  - `/api/compile` Route Handler & Compilation Modal.

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |
| Dual Bedrock / Rule Fallback Engine | Phase 2 | Implementation | Guarantees zero-fail demo on camera regardless of AWS quota |

### Blockers/Concerns
- Ready for Phase 3: Slide-out API Tester drawer and DynamoDB Live Inspector drawer.

---
*Last updated: 2026-09-16*
