# Project State — NapkinCloud

## Current Position
**Phase:** 1 — Canvas & Graph Representation  
**Status:** Ready to execute  
**Last activity:** 2026-09-16 — Phase 1 planned (3 task plans created)  

## Plans Summary (Phase 1)
- `01-01`: Project Scaffold & React Flow Dark Canvas (R01)
- `01-02`: Custom AWS Nodes & Connection Constraints (R02, R03)
- `01-03`: Sidebar Drag-and-Drop & Graph JSON Exporter (R04)

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |

### Blockers/Concerns
- Ensure Amazon Bedrock Claude 3.5 Sonnet model access is confirmed in AWS console prior to Day 2 sprint.

---
*Last updated: 2026-09-16*
