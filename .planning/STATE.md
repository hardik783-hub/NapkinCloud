# Project State — NapkinCloud

## Current Position
**Phase:** 1 — Canvas & Graph Representation  
**Status:** Ready to plan  
**Last activity:** 2026-09-16 — Project initialized via GSD workflow  

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |

### Blockers/Concerns
- Ensure Amazon Bedrock Claude 3.5 Sonnet model access is confirmed in AWS console (`us-east-1` or `us-west-2`) prior to Day 2 sprint.

---
*Last updated: 2026-09-16*
