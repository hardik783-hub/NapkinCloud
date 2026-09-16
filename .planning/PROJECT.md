# NapkinCloud

## Vision
NapkinCloud is a visual cloud-development tool that transforms backend architectures drawn on an infinite canvas into real, live AWS infrastructure in seconds. Once deployed, the same canvas turns into an interactive control surface for firing live API requests and inspecting database items in real time.

## Core Value
**The 30-Second Turnaround:** A developer draws `API Gateway` ⟶ `Lambda` ⟶ `DynamoDB`, clicks **"⚡ Compile to AWS"**, and within seconds the nodes light up green (`🟢 LIVE`), allowing live API testing and real-time DynamoDB inspection directly within the canvas.

## Target Users
Developers, hackathon participants, students, and architects participating in the WeMakeDevs x AWS "First Commit" Hackathon who want to go from whiteboard architecture directly to working, deployed serverless infrastructure without wrestling with boilerplate CloudFormation or IAM syntax.

## Technical Context
- **User's Ownership Scope:**
  - **Frontend:** Next.js (App Router), React Flow (`@xyflow/react`), Tailwind CSS, custom node components, node lifecycle states (`draft` ⟶ `compiling` ⟶ `deploying` ⟶ `🟢 live` ⟶ `failed`), slide-out API tester and DynamoDB inspector drawers.
  - **Backend Application Logic:** Next.js API routes (`/api/compile`, `/api/status`, `/api/test`, `/api/data`), graph topology validator, state management.
  - **AI & Compiler Engine:** Amazon Bedrock (Claude 3.5 Sonnet structured JSON mode), intent & business logic normalizer, deterministic SAM/CloudFormation template generator.
- **Teammate's Ownership Scope:**
  - AWS Step Functions orchestration state machine, CloudFormation stack deployment pipeline, IAM roles, S3 artifact buckets, AWS Amplify hosting.
- **Key Interface Contract:**
  - User outputs: `{ projectId, templateYaml, handlerJs }`
  - Teammate returns: `{ projectId, status: "LIVE", deployedApiUrl, tableName }`

## Requirements

### Validated
(None yet — sprint begins on Sept 17)

### Active
- [ ] Interactive React Flow canvas with custom nodes for `API Gateway`, `Lambda`, and `DynamoDB`
- [ ] Export strict canvas graph JSON with node attributes, labels, and directional edges
- [ ] Backend graph validator to ensure supported topologies before synthesis
- [ ] Amazon Bedrock integration (Claude 3.5 Sonnet) to normalize natural-language annotations into structured JSON
- [ ] Deterministic SAM compiler that merges Bedrock outputs into tested `template.yaml` and `handler.js`
- [ ] In-canvas slide-out API request tester drawer with live execution
- [ ] In-canvas slide-out DynamoDB inspector drawer displaying live records
- [ ] Fallback template injection engine for zero-fail demo reliability

### Out of Scope (Strict Anti-Scope)
- Arbitrary support for dozens of AWS services (stick strictly to P0: API Gateway, Lambda, DynamoDB; P1: S3, SQS)
- Full real-time multi-user collaboration
- Complex user authentication / SSO systems
- Sophisticated cost prediction engines
- General-purpose conversational AI chatbots
- Multi-cloud providers (GCP, Azure) or Kubernetes

## Key Decisions

| Decision | Source | Rationale | Outcome |
|----------|--------|-----------|---------|
| Deterministic SAM Compiler | User/Team | Prevents LLM CloudFormation syntax hallucination and deployment rollbacks | Decided |
| Scope to P0 pattern | User/Team | "One feature that runs beats five that almost do" | Decided |
| Ownership boundary | User | User owns Frontend, Backend App Logic, and AI Engine; Teammate owns AWS Cloud Infra & Deployment | Decided |
| React Flow over tldraw | AI-suggested | Native support for structured ports, custom node components, and state styling | Agreed |

---
*Last updated: 2026-09-16 after GSD initialization*
