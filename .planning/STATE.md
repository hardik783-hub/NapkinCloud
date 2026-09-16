# Project State — NapkinCloud

## Current Position
**Phase:** 2 — AI Reasoning & Deterministic Compiler  
**Status:** Ready to plan  
**Last activity:** 2026-09-16 — Phase 1 execution completed and verified  

## Completed Phases
- **Phase 1: Canvas & Graph Representation** (3 plans executed, verified with `npm run build`)
  - Fullscreen dark canvas with React Flow v12.
  - Custom nodes: `ApiGatewayNode`, `LambdaNode`, `DynamoDbNode` with live state indicators.
  - Sidebar drag-and-drop component palette.
  - Strict connection constraints (`API Gateway` -> `Lambda` -> `DynamoDB`).
  - Graph JSON export and TopBar action controls.

## Key Decisions

| Decision | Phase | Source | Rationale |
|----------|-------|--------|-----------|
| User owns Frontend + Backend Logic + AI Engine | Init | User | Matches user's exact scope; teammate manages AWS infra/deployment |
| Deterministic SAM Compiler | Init | Team | Eliminates LLM syntax hallucinations and deployment rollbacks |
| Scope strictly to P0 pattern | Init | Team | Ensures delivery of one reliable, working feature before expanding |
| React Flow (`@xyflow/react`) | Init | Team | Native handle ports, custom node components, and state styling |
| Connection restrictions enforced in canvas | Phase 1 | Implementation | Prevents invalid topology generation before graph reaches backend |

### Blockers/Concerns
- Set up AWS SDK credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1`) for testing Bedrock runtime client in Phase 2.

---
*Last updated: 2026-09-16*
