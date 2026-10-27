import { PromptTemplate } from '../types/llm';

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl-distributed-arch',
    title: 'Distributed System Architecture & Tradeoff Blueprint',
    category: 'Coding & Architecture',
    description:
      'Generate a production-ready architecture design with capacity estimation, data models, failure modes, and implementation code.',
    systemPrompt:
      'You are a Principal Distributed Systems Architect. Provide concrete capacity math, latency budgets, failure recovery patterns, and clean implementation code.',
    template: `Design a production-grade **{{system_name}}** handling **{{scale_target}}** with a strict latency SLA of **{{latency_sla}}**.

Please structure your response with:
1. **High-Level Architecture & Data Flow** (ASCII diagram + component responsibilities)
2. **Back-of-the-Envelope Capacity & Bandwidth Math**
3. **Core Algorithm / Data Structure Implementation** in **{{language}}**
4. **Edge Cases, Race Conditions & Failover Strategy**`,
    defaultVariables: {
      system_name: 'Distributed Sliding-Window Rate Limiter',
      scale_target: '250,000 requests/sec across 12 edge regions',
      latency_sla: 'p99 < 4ms',
      language: 'TypeScript (with Redis Lua atomic script)',
    },
    recommendedModels: ['claude-3-7-sonnet', 'gemini-2.5-pro', 'deepseek-r1'],
    isFavorite: true,
  },
  {
    id: 'tpl-algorithmic-reasoning',
    title: 'Formal Algorithmic Proof & Optimization Challenge',
    category: 'Reasoning & Math',
    description:
      'Test deep chain-of-thought reasoning on algorithmic complexity, mathematical invariants, and optimal code generation.',
    systemPrompt:
      'You are a competitive programming grandmaster and computer science theorist. State loop invariants formally, prove optimality, and provide clean O(N) or optimal time/space code.',
    template: `Solve and formally analyze the following problem:

**Problem**: {{problem_statement}}

**Constraints**: {{constraints}}

Provide:
1. **Intuition & Mathematical Invariant**
2. **Formal Proof of Time & Space Complexity**
3. **Production-Ready Implementation** in **{{language}}** with dry-run trace on a non-trivial edge case.`,
    defaultVariables: {
      problem_statement:
        'Find the minimum cost to merge K sorted streams of dynamic telemetry events where each stream arrives out-of-order by at most D milliseconds.',
      constraints: 'K <= 10^4 streams, N <= 10^7 total events, memory budget <= 64MB',
      language: 'Rust / TypeScript',
    },
    recommendedModels: ['o3-mini', 'deepseek-r1', 'qwq-32b'],
    isFavorite: true,
  },
  {
    id: 'tpl-security-audit',
    title: 'Zero-Trust Code Security & Vulnerability Audit',
    category: 'Code Review & Security',
    description:
      'Audit source code for injection vectors, race conditions, broken auth, SSRF, and cryptographic pitfalls with remediated patches.',
    systemPrompt:
      'You are a Staff Application Security Engineer performing a threat-modeled code audit. Classify issues by CVSS severity, explain the exploit payload, and provide the exact remediated diff.',
    template: `Perform a comprehensive security & concurrency audit on the following **{{framework}}** snippet:

\`\`\`
{{code_snippet}}
\`\`\`

For every vulnerability discovered:
- **Severity & CWE ID**
- **Proof-of-Concept Exploit Scenario**
- **Hardened, Production-Safe Patch**`,
    defaultVariables: {
      framework: 'Node.js / Express JWT & Webhook Handler',
      code_snippet: `app.post('/api/webhook/payment', async (req, res) => {
  const sig = req.headers['x-signature'];
  const expected = crypto.createHmac('sha256', SECRET).update(JSON.stringify(req.body)).digest('hex');
  if (sig == expected) {
    const user = await db.query(\`SELECT * FROM accounts WHERE id = '\${req.body.userId}'\`);
    await fetch(req.body.callbackUrl, { method: 'POST', body: JSON.stringify(user) });
    return res.status(200).send({ ok: true });
  }
  res.status(401).send('Invalid');
});`,
    },
    recommendedModels: ['claude-3-7-sonnet', 'gpt-4o', 'qwen-2.5-coder-32b'],
    isFavorite: true,
  },
  {
    id: 'tpl-json-extraction',
    title: 'Strict Schema JSON Entity & Financial Extractor',
    category: 'Data Extraction',
    description:
      'Convert messy unstructured text, emails, or logs into deterministic, strictly-typed JSON adhering to a TypeScript/JSON schema.',
    systemPrompt:
      'You are a deterministic structured-data extraction engine. Always return valid JSON matching the requested schema, normalizing dates to ISO-8601 and currency amounts to numbers.',
    template: `Extract all structured entities, line items, obligations, and risk flags from the unstructured document below.

**Target Schema**:
\`{{target_schema}}\`

**Raw Input Text**:
"""
{{raw_document}}
"""

Provide the validated JSON output followed by a brief confidence & ambiguity report.`,
    defaultVariables: {
      target_schema:
        '{ vendor: string, invoiceDateISO: string, currency: "USD"|"EUR", lineItems: Array<{sku: string, qty: number, unitPrice: number, subtotal: number}>, totalCalculated: number, discrepancyDetected: boolean, riskFlags: string[] }',
      raw_document:
        'INV #9941-B from CloudScale Systems Inc. dated March 14th, 2025. 4x Dedicated H100 Nodes @ $4,250/mo each = $17,000. 12TB NVMe Block Storage @ $120/TB = $1,440. Enterprise Support Add-on = $850. Grand Total billed: $19,590 USD. Note: Payment due net-7 or 4.5% late fee applies automatically.',
    },
    recommendedModels: ['gpt-4o', 'gemini-2.0-flash', 'llama-3.3-70b-instruct'],
  },
  {
    id: 'tpl-agent-router',
    title: 'Multi-Agent Orchestrator & Tool-Calling System Prompt',
    category: 'Agent Workflows',
    description:
      'Design a deterministic ReAct / Tool-Use agent loop with planning, verification, and fallback guardrails.',
    systemPrompt:
      'You are an AI Agent Architect specializing in reliable multi-step tool orchestration, deterministic state machines, and hallucination prevention.',
    template: `Design a complete **{{agent_role}}** agent workflow that has access to these tools: **{{available_tools}}**.

User Goal: "{{user_goal}}"

Generate:
1. **System Prompt & Guardrail Specification**
2. **Step-by-Step Execution Trace (Thought -> Tool Call JSON -> Observation -> Verification)**
3. **TypeScript Orchestrator Loop with Retry & Schema Validation**`,
    defaultVariables: {
      agent_role: 'Autonomous Incident Response & Root-Cause Triage Agent',
      available_tools: 'query_prometheus_metrics, search_k8s_pod_logs, git_blame_recent_commits, post_slack_incident_report',
      user_goal: 'Checkout API p99 latency spiked from 120ms to 4.8s in us-east-1 after deploy v2.14.9.',
    },
    recommendedModels: ['claude-3-7-sonnet', 'gemini-2.5-pro', 'gpt-4o'],
  },
  {
    id: 'tpl-sql-optimizer',
    title: 'PostgreSQL Query Planner & Index Tuning Specialist',
    category: 'Coding & Architecture',
    description:
      'Rewrite slow analytical SQL queries, design covering/partial indexes, and explain the EXPLAIN ANALYZE execution plan.',
    systemPrompt:
      'You are a Principal Database Internals Engineer specializing in PostgreSQL 17 query optimization, MVCC, and B-Tree/GIN indexing.',
    template: `Optimize the following slow **{{database_engine}}** query running against a table with **{{table_scale}}**:

\`\`\`sql
{{slow_query}}
\`\`\`

Deliver:
1. **Why the Current Plan Degrades (Seq Scan / Sort / Heap Fetch Bottlenecks)**
2. **Exact Index DDL (Covering / Partial / Composite Indexes)**
3. **Rewritten High-Performance SQL Query**
4. **Expected Execution Plan & Speedup Factor**`,
    defaultVariables: {
      database_engine: 'PostgreSQL 17',
      table_scale: '180 million rows in llm_request_logs (420 GB)',
      slow_query: `SELECT provider, model_id, AVG(latency_ms), SUM(cost_usd)
FROM llm_request_logs
WHERE LOWER(status) = 'success'
  AND created_at >= NOW() - INTERVAL '7 days'
  AND metadata->>'workspace_tier' = 'enterprise'
GROUP BY provider, model_id
ORDER BY SUM(cost_usd) DESC;`,
    },
    recommendedModels: ['deepseek-v3', 'claude-3-7-sonnet', 'qwen-2.5-coder-32b'],
  },
];
