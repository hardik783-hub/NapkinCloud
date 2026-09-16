# Phase 2: AI Reasoning & Deterministic Compiler — Research

## Implementation Approach
Phase 2 transforms the raw Graph JSON emitted by the Phase 1 canvas into production-ready AWS infrastructure artifacts (`template.yaml` and `handler.js`).

1. **Topology Validator (`validator.ts`):** Checks that the graph conforms to the supported P0 contract: exactly one API Gateway trigger, connecting to a Lambda function, connecting to a DynamoDB table. Rejects unconnected nodes, cycles, and unsupported services before invoking Bedrock.
2. **Bedrock Intent Normalizer (`bedrock.ts`):** Uses `@aws-sdk/client-bedrock-runtime` invoking Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20240620-v1:0`) with strict structured JSON output instructions. Normalizes user natural-language logic annotations into sanitized JavaScript business logic. Includes an offline/smart fallback engine when AWS credentials or Bedrock quotas are unavailable.
3. **Deterministic SAM Compiler (`compiler.ts`):** Uses a pre-tested, battle-hardened AWS SAM template (`template.yaml`) and injects normalized parameters (HTTP route, method, function name, table name, partition key) into exact slots. Ensures `Cors: "'*'"` is hardcoded on `HttpApi`.
4. **Lambda Handler Synthesizer (`lambdaSynthesizer.ts`):** Generates clean, ES-module / CommonJS Node.js 20.x handler code utilizing `@aws-sdk/lib-dynamodb` (`PutCommand` / `GetCommand`) with robust try/catch blocks and proper HTTP response status codes (`200` with JSON body, `400` on validation errors, `500` on internal exceptions).
5. **Next.js API Route (`/api/compile`):** Connects the frontend **"⚡ Compile to AWS"** button to the compilation pipeline, returning the compiled artifacts to the frontend and logging the hand-off contract for the teammate's Step Functions deployment.

## Libraries & Tools
| Library | Purpose | Why | Confidence | Source |
|---------|---------|-----|-----------|--------|
| `@aws-sdk/client-bedrock-runtime` | Bedrock Claude 3.5 Sonnet invocation | Official AWS SDK v3 client for foundation models on Bedrock | HIGH | npmjs.com/package/@aws-sdk/client-bedrock-runtime |
| Node.js `crypto` / `nanoid` | Unique project and resource IDs | Ensures collision-free CloudFormation logical IDs | HIGH | Node.js standard library |

## Patterns to Follow
- **Strict Separation of Concerns:** Bedrock normalizes intent into structured JSON; our deterministic compiler generates the actual CloudFormation YAML. Bedrock NEVER writes raw CloudFormation.
- **Fail-Safe Offline Engine:** If Bedrock is unreachable or credentials are missing during local dev or live demo recording, the system seamlessly activates the deterministic rule-based extractor so compilation never fails on camera.

---
*Researched: 2026-09-16*
