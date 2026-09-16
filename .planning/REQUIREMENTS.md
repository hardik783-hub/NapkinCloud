# Requirements — NapkinCloud (Fullstack & AI Scope)

## Overview
These requirements cover the user's ownership scope: Frontend UI/UX, Backend Application Logic, and the AI Reasoning & Deterministic Compiler Engine. Cloud infrastructure, Step Functions, and IAM pipelines are managed by the teammate.

## V1 — Must Have (P0)

| ID | Requirement | Phase | Status |
|----|-------------|-------|--------|
| R01 | Interactive React Flow dark-mode canvas with dot grid and zooming/panning | Phase 1 | Planned |
| R02 | Custom drag-and-drop nodes: API Gateway (method, path), Lambda (name, logic note), DynamoDB (table name, primary key) | Phase 1 | Planned |
| R03 | Directional edge connections with validation rules (API -> Lambda -> DynamoDB) | Phase 1 | Planned |
| R04 | Export strict Graph JSON payload representing nodes, edges, and user annotations | Phase 1 | Planned |
| R05 | Backend graph validator that rejects unsupported or cyclic topologies before AI invocation | Phase 2 | Planned |
| R06 | Amazon Bedrock (Claude 3.5 Sonnet) intent normalizer with structured JSON output schema | Phase 2 | Planned |
| R07 | Deterministic SAM template compiler that injects normalized parameters into pre-tested template | Phase 2 | Planned |
| R08 | Synthesize production-ready JavaScript Lambda handler (`handler.js`) with DynamoDB PutItem logic | Phase 2 | Planned |
| R09 | Fallback template slot-injection engine for instant offline/zero-fail generation | Phase 2 | Planned |
| R10 | Real-time node status progression: `draft` ⟶ `compiling` ⟶ `deploying` ⟶ `🟢 live` ⟶ `🔴 failed` | Phase 3 | Planned |
| R11 | In-canvas slide-out API tester drawer with editable JSON payload and live execution trigger | Phase 3 | Planned |
| R12 | In-canvas slide-out DynamoDB inspector drawer rendering live queried records | Phase 3 | Planned |

## V2 — Nice to Have (P1)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| R13 | S3 bucket storage node pattern (`API Gateway -> Lambda -> S3`) | High | Backlog |
| R14 | Async SQS queue node pattern (`API Gateway -> Lambda -> SQS -> Lambda -> DynamoDB`) | Medium | Backlog |
| R15 | Live estimated AWS monthly cost badge on canvas | Medium | Backlog |
| R16 | Export deployable SAM ZIP package for manual CLI download | Low | Backlog |

## Out of Scope
- Full multi-user collaboration (WebSockets / CRDTs)
- Complex user authentication or team workspaces
- Arbitrary cloud services beyond P0/P1 set
- Multi-cloud deployment (GCP, Azure)
- Kubernetes / Container cluster management

---
*Last updated: 2026-09-16*
