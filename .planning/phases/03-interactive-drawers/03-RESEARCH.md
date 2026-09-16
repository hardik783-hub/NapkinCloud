# Phase 3: Interactive Drawers & Live Testing — Research

## Implementation Approach
Phase 3 elevates the canvas from a static diagramming tool into an active, live cloud control surface.

1. **State Machine & Control Surface Activation (`R10`):**
   - When the user compiles and closes the modal (or initiates deployment), nodes transition from `compiling` $\rightarrow$ `deploying` $\rightarrow$ `🟢 live`.
   - In the `🟢 live` state:
     - Nodes glow with an emerald green border (`border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]`).
     - Badges update to `LIVE` with assigned live ARNs/URLs.
     - Nodes become clickable interactive triggers.
2. **Slide-Out In-Canvas API Tester Drawer (`R11`):**
   - Clicking the live API Gateway node slides open a right-side drawer.
   - Pre-fills HTTP method, URL endpoint, and an editable JSON request body (`{ "item": "MacBook Pro M3", "qty": 1, "price": 1999 }`).
   - "Send Request" button fires the request via `/api/test`, displaying response code (`200 OK`), round-trip latency, and formatted JSON response.
3. **Slide-Out In-Canvas DynamoDB Inspector Drawer (`R12`):**
   - Clicking the live DynamoDB node slides open a table inspector drawer.
   - Fetches and displays records via `/api/data`.
   - Renders interactive table rows with partition key, created timestamp, and JSON attributes.
   - Auto-refreshes whenever a successful request is sent from the API tester drawer!

## Libraries & Tools
| Library | Purpose | Why | Confidence | Source |
|---------|---------|-----|-----------|--------|
| `lucide-react` | Icons for drawers (`Play`, `Send`, `Database`, `RefreshCw`, `Table`, `CheckCircle2`) | Uniform visual language | HIGH | npmjs.com/package/lucide-react |
| React state & context | Synchronization between API Tester and DB Inspector | Instant table update when test request succeeds | HIGH | React core |

## Pitfalls to Avoid
- **Drawer blocking node clicks:** Use standard slide-over positioning (`fixed right-0 top-0 bottom-0 z-40`) with a clean backdrop or push layout so canvas remains visible.
- **Data desynchronization:** Firing a test request in the API drawer should immediately trigger a refresh event so opening the DynamoDB drawer shows the new row instantly without manual page reloads.

---
*Researched: 2026-09-16*
