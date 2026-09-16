# Phase 1: Canvas & Graph Representation — Research

## Implementation Approach
Build an intuitive, high-contrast dark-mode canvas using Next.js 14+ (App Router) and `@xyflow/react` (React Flow v12). The user can drag components from a sidebar (`API Gateway`, `Lambda`, `DynamoDB`), place them on the grid, connect them with directional arrows with handle restrictions, and edit inline labels.

## Libraries & Tools
| Library | Purpose | Why | Confidence | Source |
|---------|---------|-----|-----------|--------|
| `@xyflow/react` | Visual node-and-edge canvas | Official modern React Flow library; built-in zooming, panning, custom node rendering, handle placement, and event hooks | HIGH | [reactflow.dev](https://reactflow.dev) |
| `lucide-react` | Icons for AWS services and actions | Clean, lightweight SVG icons (`Server`, `Database`, `Globe`, `Zap`, `Play`, `CheckCircle`) | HIGH | npmjs.com/package/lucide-react |
| `tailwindcss` | Dark-mode styling & layout | Fast, utility-first styling for glowing node states, drawers, and control bars | HIGH | tailwindcss.com |
| `clsx` / `tailwind-merge` | Conditional classes | Clean status badge class concatenation | HIGH | npmjs.com/package/clsx |

## Patterns to Follow
- **Custom Node Components:** Define separate React components for `ApiGatewayNode`, `LambdaNode`, `DynamoDbNode` implementing standard `Handle` ports with `Position.Right` (source) and `Position.Left` (target).
- **Controlled Flow State:** Use `useNodesState` and `useEdgesState` hooks with `onNodesChange`, `onEdgesChange`, and `onConnect`.
- **Strict Graph Normalization:** When exporting, transform React Flow nodes and edges into a backend-friendly schema:
  ```json
  {
    "projectId": "string",
    "nodes": [
      { "id": "node-1", "type": "api_gateway", "data": { "method": "POST", "path": "/orders" } },
      { "id": "node-2", "type": "lambda", "data": { "name": "CreateOrder", "logic": "save order" } },
      { "id": "node-3", "type": "dynamodb", "data": { "table": "Orders", "pk": "orderId" } }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2" },
      { "source": "node-2", "target": "node-3" }
    ]
  }
  ```

## Pitfalls to Avoid
- **Missing CSS import:** React Flow requires `@xyflow/react/dist/style.css`. Without it, nodes collapse and handles don't render.
- **Unbounded edge connections:** Prevent invalid connections (e.g., `DynamoDB -> API Gateway` or self-connections) by adding an `isValidConnection` callback on `<ReactFlow>`.
- **Next.js SSR Issues:** Canvas components must be marked `'use client'` because React Flow relies on browser DOM measurements.

---
*Researched: 2026-09-16*
