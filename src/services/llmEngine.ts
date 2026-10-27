import {
  LLMModel,
  ModelParameters,
  ModelResponseMetrics,
  ProviderConfig,
} from '../types/llm';

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Accurate heuristic: ~3.8 chars per token for technical English + code
  const words = text.trim().split(/\s+/).length;
  const charEstimate = Math.ceil(text.length / 3.8);
  return Math.max(1, Math.round((words * 1.35 + charEstimate) / 2));
}

export function calculateCostUsd(
  model: LLMModel,
  promptTokens: number,
  completionTokens: number
): number {
  const inputCost = (promptTokens / 1_000_000) * model.pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * model.pricing.outputPerMillion;
  return Number((inputCost + outputCost).toFixed(6));
}

function buildSimulatedReasoning(model: LLMModel, prompt: string, effort: string): string {
  const p = prompt.toLowerCase();
  const depthNote =
    effort === 'high'
      ? 'Executing deep multi-path verification and formal boundary check.'
      : effort === 'low'
      ? 'Performing rapid first-principles decomposition.'
      : 'Balancing analytical depth with concise implementation.';

  if (p.includes('security') || p.includes('webhook') || p.includes('audit') || p.includes('vulnerability')) {
    return `[${model.name} Reasoning Trace • Effort: ${effort.toUpperCase()}]
1. Parsing control flow and untrusted input sinks in the provided handler.
2. Checking cryptographic signature verification:
   - Found \`sig == expected\` using standard equality rather than \`crypto.timingSafeEqual\`, exposing a timing side-channel.
   - \`JSON.stringify(req.body)\` re-serializes parsed JSON rather than hashing the raw request buffer.
3. Checking database query construction:
   - String interpolation \`'\${req.body.userId}'\` directly inside SQL enables stacked/union SQL Injection (CWE-89).
4. Checking outbound network call:
   - \`fetch(req.body.callbackUrl)\` with unvalidated URL leaks the entire \`user\` record — critical SSRF + data exfiltration (CWE-918).
5. ${depthNote}`;
  }

  if (p.includes('rate limit') || p.includes('distributed') || p.includes('redis') || p.includes('architecture')) {
    return `[${model.name} Reasoning Trace • Effort: ${effort.toUpperCase()}]
1. Deconstructing throughput and latency constraints: 250k RPS across 12 PoPs with p99 < 4ms.
2. Evaluating centralized vs. hybrid edge-local token bucket / sliding window counters:
   - Cross-region synchronous consensus per request violates the 4ms budget (trans-oceanic RTT is 70-150ms).
   - Optimal topology: Local Redis Cluster per PoP with atomic Lua sliding-window scripts + asynchronous gossip/batch quota reconciliation every 100ms.
3. Verifying Redis atomic script complexity: O(1) using two hash buckets (previous & current window) instead of O(log N) ZSET per request to reduce memory by 82%.
4. ${depthNote}`;
  }

  if (p.includes('sql') || p.includes('postgres') || p.includes('index') || p.includes('query')) {
    return `[${model.name} Reasoning Trace • Effort: ${effort.toUpperCase()}]
1. Inspecting predicates in the WHERE clause against 180M rows (420 GB):
   - \`LOWER(status) = 'success'\` prevents standard B-Tree usage on \`status\` unless a functional index exists.
   - \`metadata->>'workspace_tier' = 'enterprise'\` extracts a JSONB key on every row during heap scan.
2. Formulating optimal Partial Covering Index (Index-Only Scan):
   - Filter condition: \`WHERE status = 'success' AND (metadata->>'workspace_tier') = 'enterprise'\`
   - Key column: \`(created_at, provider, model_id) INCLUDE (latency_ms, cost_usd)\`.
3. Estimating heap page elimination: eliminates 99.4% of random I/O and enables an Index-Only Scan.
4. ${depthNote}`;
  }

  if (p.includes('json') || p.includes('extract') || p.includes('invoice') || p.includes('schema')) {
    return `[${model.name} Reasoning Trace • Effort: ${effort.toUpperCase()}]
1. Extracting financial entities and line items from raw OCR/document text.
2. Performing arithmetic reconciliation check:
   - Line 1: 4 * $4,250 = $17,000
   - Line 2: 12 * $120 = $1,440
   - Line 3: 1 * $850 = $850
   - Sum of line items = $17,000 + $1,440 + $850 = $19,290 USD.
   - Billed Grand Total in text = $19,590 USD -> Discrepancy of +$300 detected!
3. Validating output strictly against requested JSON schema and ISO-8601 date formatting.
4. ${depthNote}`;
  }

  return `[${model.name} Reasoning Trace • Effort: ${effort.toUpperCase()}]
1. Analyzing user objective and system prompt constraints (${model.contextWindow.toLocaleString()} token context window available).
2. Decomposing the problem into core architectural principles, edge cases, and concrete code artifacts.
3. Cross-checking algorithmic complexity, type safety, and operational trade-offs specific to ${model.providerName}'s training priors.
4. ${depthNote}`;
}

function buildSimulatedResponse(model: LLMModel, prompt: string, systemPrompt: string): string {
  const p = prompt.toLowerCase();

  // 1. Security audit prompt
  if (p.includes('security') || p.includes('webhook') || p.includes('vulnerability') || p.includes('cwe')) {
    return `### Security & Threat Audit Report (${model.name})

I identified **4 high/critical vulnerabilities** in the provided webhook handler that allow unauthenticated database compromise and data exfiltration.

| # | Vulnerability | CWE | Severity | Impact |
|---|---|---|---|---|
| 1 | **SQL Injection via String Interpolation** | CWE-89 | **CRITICAL (9.8)** | Full read/write database compromise via \`req.body.userId\` |
| 2 | **SSRF + Sensitive Data Exfiltration** | CWE-918 | **CRITICAL (9.4)** | Attacker controls \`callbackUrl\` and receives full \`accounts\` row |
| 3 | **Timing Side-Channel & Re-serialized HMAC** | CWE-208 | **HIGH (7.5)** | \`==\` leaks byte-by-byte HMAC timing; \`JSON.stringify\` breaks raw body integrity |
| 4 | **Missing Replay Protection (Timestamp Nonce)** | CWE-294 | **MEDIUM (6.5)** | Captured valid webhooks can be replayed indefinitely |

---

### Remediated Production Patch

\`\`\`typescript
import crypto from 'node:crypto';
import express from 'express';

const ALLOWED_CALLBACK_HOSTS = new Set(['hooks.internal.payments.io']);

// Use express.raw({ type: 'application/json' }) on this route
app.post('/api/webhook/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signatureHeader = String(req.headers['x-signature'] || '');
    const timestampHeader = Number(req.headers['x-timestamp'] || 0);

    // 1. Replay window protection (5 minutes)
    if (Math.abs(Date.now() - timestampHeader) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Expired webhook timestamp' });
    }

    // 2. Constant-time HMAC verification over raw bytes + timestamp
    const expectedHmac = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET!)
      .update(\`\${timestampHeader}.\`)
      .update(req.body)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHeader, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ error: 'Invalid cryptographic signature' });
    }

    const payload = JSON.parse(req.body.toString('utf8'));

    // 3. Parameterized query eliminates SQL Injection (CWE-89)
    const { rows } = await db.query(
      'SELECT id, status, plan_tier FROM accounts WHERE id = $1 LIMIT 1',
      [String(payload.userId)]
    );

    // 4. Strict allowlist validation prevents SSRF & PII exfiltration
    const parsedUrl = new URL(payload.callbackUrl);
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_CALLBACK_HOSTS.has(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Disallowed callback destination' });
    }

    await fetch(parsedUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: rows[0]?.id, status: rows[0]?.status }),
      signal: AbortSignal.timeout(3000),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: 'Malformed webhook request' });
  }
});
\`\`\``;
  }

  // 2. JSON / Invoice extraction prompt
  if (p.includes('json') || p.includes('invoice') || p.includes('extract') || p.includes('schema')) {
    return `### Validated Structured JSON Output (${model.name})

\`\`\`json
{
  "vendor": "CloudScale Systems Inc.",
  "invoiceDateISO": "2025-03-14",
  "currency": "USD",
  "lineItems": [
    {
      "sku": "DEDICATED-H100-NODE",
      "qty": 4,
      "unitPrice": 4250,
      "subtotal": 17000
    },
    {
      "sku": "NVME-BLOCK-STORAGE-TB",
      "qty": 12,
      "unitPrice": 120,
      "subtotal": 1440
    },
    {
      "sku": "ENTERPRISE-SUPPORT-ADDON",
      "qty": 1,
      "unitPrice": 850,
      "subtotal": 850
    }
  ],
  "totalCalculated": 19290,
  "billedTotalStated": 19590,
  "discrepancyDetected": true,
  "riskFlags": [
    "ARITHMETIC_MISMATCH: Sum of line items ($19,290) is $300 less than billed Grand Total ($19,590)",
    "AGGRESSIVE_PAYMENT_TERMS: Net-7 due date with automatic 4.5% late penalty clause"
  ]
}
\`\`\`

#### Audit & Confidence Summary
- **Schema Compliance**: 100% strict match.
- **Anomaly Alert**: Flagged a **$300.00 overbilling discrepancy** between the itemized subtotals (\`$17,000 + $1,440 + $850 = $19,290\`) and the stated invoice total (\`$19,590\`).`;
  }

  // 3. SQL / Database optimization prompt
  if (p.includes('sql') || p.includes('postgres') || p.includes('llm_request_logs')) {
    return `### PostgreSQL 17 Query Optimization Plan (${model.name})

#### 1. Root Cause of Current Degradation
1. **Non-SARGable Function Predicate**: \`LOWER(status) = 'success'\` forces PostgreSQL to evaluate \`LOWER()\` on every row, bypassing standard indexes on \`status\`.
2. **Runtime JSONB Extraction**: \`metadata->>'workspace_tier' = 'enterprise'\` de-TOASTs and parses JSONB across 180M rows.
3. **Massive Heap I/O**: Aggregating \`latency_ms\` and \`cost_usd\` requires random heap fetches without an \`INCLUDE\` covering index.

---

#### 2. Optimal Partial Covering Index DDL

\`\`\`sql
CREATE INDEX CONCURRENTLY idx_llm_logs_enterprise_success_covering
ON llm_request_logs (created_at, provider, model_id)
INCLUDE (latency_ms, cost_usd)
WHERE status = 'success'
  AND (metadata->>'workspace_tier') = 'enterprise';
\`\`\`

---

#### 3. Rewritten High-Performance Query

\`\`\`sql
SELECT
  provider,
  model_id,
  ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms,
  ROUND(SUM(cost_usd)::numeric, 4)   AS total_cost_usd
FROM llm_request_logs
WHERE status = 'success'
  AND (metadata->>'workspace_tier') = 'enterprise'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider, model_id
ORDER BY total_cost_usd DESC;
\`\`\`

- **Execution Strategy**: Shifts from **Parallel Seq Scan (420 GB read, ~38.4s)** to an **Index-Only Scan (~110 MB read, ~19ms)** — a **~2,000x speedup** with zero heap fetches (\`Heap Fetches: 0\`).`;
  }

  // 4. Rate limiter / Distributed architecture prompt
  if (p.includes('rate limit') || p.includes('sliding') || p.includes('distributed') || p.includes('redis')) {
    return `### Distributed Sliding-Window Rate Limiter (${model.name})

#### 1. Architecture & Capacity Math
- **Scale Target**: \`250,000 RPS\` across \`12 edge regions\` (~21,000 RPS per PoP).
- **Memory Footprint**: Instead of storing every timestamp in a Redis \`ZSET\` (\`O(N)\` memory), we use **Sliding Window Counter Approximation** requiring only **2 integers per key** (~64 bytes/key). For 10M active keys, total memory is **~640 MB**.
- **Latency Budget (\`p99 < 4ms\`)**:
  - Edge Worker to local PoP Redis Cluster: \`0.6ms\`
  - Atomic Lua execution: \`0.15ms\`
  - Total p99 overhead: **\`~1.4ms\`**

---

#### 2. Atomic Redis Lua + TypeScript Implementation

\`\`\`typescript
// Atomic Sliding-Window Approximation Lua Script (O(1) time & space)
const SLIDING_WINDOW_LUA = \`
  local current_key = KEYS[1]
  local previous_key = KEYS[2]
  local limit = tonumber(ARGV[1])
  local window_ms = tonumber(ARGV[2])
  local now_ms = tonumber(ARGV[3])
  local weight = tonumber(ARGV[4])

  local curr_count = tonumber(redis.call('GET', current_key) or '0')
  local prev_count = tonumber(redis.call('GET', previous_key) or '0')

  local elapsed_in_window = (now_ms % window_ms) / window_ms
  local estimated_count = math.floor(prev_count * (1 - elapsed_in_window) + curr_count)

  if estimated_count + weight > limit then
    local retry_after_ms = math.ceil((1 - elapsed_in_window) * window_ms)
    return { 0, estimated_count, retry_after_ms }
  end

  local updated = redis.call('INCRBY', current_key, weight)
  if updated == weight then
    redis.call('PEXPIRE', current_key, window_ms * 2)
  end

  return { 1, estimated_count + weight, 0 }
\`;

export interface RateLimitResult {
  allowed: boolean;
  currentUsage: number;
  remaining: number;
  retryAfterMs: number;
}

export async function checkSlidingWindowLimit(
  redis: { eval: (...args: unknown[]) => Promise<[number, number, number]> },
  tenantId: string,
  limit = 1000,
  windowMs = 60_000,
  costWeight = 1
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const currentBucket = Math.floor(nowMs / windowMs);
  const previousBucket = currentBucket - 1;

  const [allowedFlag, usage, retryAfterMs] = await redis.eval(
    SLIDING_WINDOW_LUA,
    2,
    \`rl:\${tenantId}:\${currentBucket}\`,
    \`rl:\${tenantId}:\${previousBucket}\`,
    limit,
    windowMs,
    nowMs,
    costWeight
  );

  return {
    allowed: allowedFlag === 1,
    currentUsage: usage,
    remaining: Math.max(0, limit - usage),
    retryAfterMs,
  };
}
\`\`\`

#### 3. Failover & Edge Resilience
- **Circuit Breaker**: If local Redis latency exceeds \`2.5ms\`, fall back to an in-memory **Token Bucket L1 Cache** in each worker isolate for 5 seconds while Redis heals.`;
  }

  // 5. General / Custom prompt tailored to the model
  return `### ${model.name} Analysis & Implementation

> **Model Profile**: \`${model.providerName}\` • \`${model.parameters}\` • Context: \`${(model.contextWindow / 1000).toFixed(0)}K tokens\` • Benchmark ELO: \`${model.benchmarks.arenaElo}\`

Based on your prompt${systemPrompt ? ' and active system instructions' : ''}, here is a structured breakdown and implementation:

#### 1. Key Architectural & Strategic Insights
- **Primary Objective**: Addressing *"${prompt.slice(0, 110)}${prompt.length > 110 ? '...' : ''}"* with deterministic execution and measurable performance boundaries.
- **Model-Specific Strength Applied**: Leveraging **${model.name}**'s ${model.strengths.join(', ')} to optimize both accuracy and token efficiency (\`$${model.pricing.inputPerMillion}/1M in\` • \`$${model.pricing.outputPerMillion}/1M out\`).

#### 2. Reference Implementation

\`\`\`typescript
export interface ExecutionContext<TInput, TOutput> {
  modelId: string;
  requestId: string;
  input: TInput;
  validate: (candidate: unknown) => candidate is TOutput;
}

export async function executeVerifiedPipeline<TInput, TOutput>(
  ctx: ExecutionContext<TInput, TOutput>,
  runner: (payload: TInput) => Promise<unknown>
): Promise<{ ok: true; data: TOutput; latencyMs: number }> {
  const startedAt = performance.now();
  const rawResult = await runner(ctx.input);

  if (!ctx.validate(rawResult)) {
    throw new Error(\`Schema validation failed for model \${ctx.modelId} (req: \${ctx.requestId})\`);
  }

  return {
    ok: true,
    data: rawResult,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
\`\`\`

#### 3. Verification & Production Checklist
1. **Deterministic Schema Guardrails**: Validate every response payload before downstream side effects.
2. **Latency & Token Budgeting**: At **${model.speedTokensPerSec} tokens/sec** and **${model.ttftSeconds}s TTFT**, this pipeline maintains sub-second interactive responsiveness.`;
}

export async function streamModelCompletion(options: {
  model: LLMModel;
  prompt: string;
  parameters: ModelParameters;
  providerConfigs: ProviderConfig[];
  preferLiveApi: boolean;
  onUpdate: (partial: {
    content: string;
    reasoningContent?: string;
    isStreaming: boolean;
    metrics?: ModelResponseMetrics;
    error?: string;
  }) => void;
}): Promise<ModelResponseMetrics> {
  const { model, prompt, parameters, providerConfigs, preferLiveApi, onUpdate } = options;
  const startTime = performance.now();

  // Check if a live API key is configured for this provider or OpenRouter
  const directProvider = providerConfigs.find(
    (c) => c.providerId === model.provider && c.enabled && c.apiKey.trim().length > 3
  );
  const openRouterProvider = providerConfigs.find(
    (c) => c.providerId === 'openrouter' && c.enabled && c.apiKey.trim().length > 3
  );
  const groqProvider =
    (model.provider === 'meta' || model.provider === 'qwen') &&
    providerConfigs.find((c) => c.providerId === 'groq' && c.enabled && c.apiKey.trim().length > 3);

  const activeConfig = directProvider || groqProvider || openRouterProvider;

  if (preferLiveApi && activeConfig) {
    try {
      return await callLiveProviderApi({
        model,
        prompt,
        parameters,
        config: activeConfig,
        startTime,
        onUpdate,
      });
    } catch (err) {
      // Gracefully surface or fallback to smart simulation if user hasn't locked out fallback
      const errMsg = err instanceof Error ? err.message : 'API error';
      console.warn(`Live API call for ${model.name} failed (${errMsg}), falling back to Demo Stream.`);
    }
  }

  // Smart Demo Streaming Simulation
  const fullReasoning = model.isReasoning
    ? buildSimulatedReasoning(model, prompt, parameters.reasoningEffort)
    : undefined;
  const fullContent = buildSimulatedResponse(model, prompt, parameters.systemPrompt);

  const promptTokens = estimateTokenCount(parameters.systemPrompt + '\n' + prompt);
  const reasoningTokens = fullReasoning ? estimateTokenCount(fullReasoning) : 0;
  const completionTokens = estimateTokenCount(fullContent) + reasoningTokens;

  // Authentic TTFT pause (scaled down slightly so UI feels snappy)
  const ttftMs = Math.round(model.ttftSeconds * 450);
  await new Promise((r) => setTimeout(r, ttftMs));

  // Stream reasoning trace first if reasoning model
  let currentReasoning = '';
  if (fullReasoning) {
    const rChunks = fullReasoning.match(/.{1,28}(\s|$)/gs) || [fullReasoning];
    for (const chunk of rChunks) {
      currentReasoning += chunk;
      onUpdate({
        content: '',
        reasoningContent: currentReasoning,
        isStreaming: true,
      });
      await new Promise((r) => setTimeout(r, 22));
    }
  }

  // Stream main content at speed proportional to model.speedTokensPerSec
  const stepDelayMs = Math.max(12, Math.round(2400 / model.speedTokensPerSec));
  const contentChunks = fullContent.match(/.{1,24}(\s|$)/gs) || [fullContent];
  let currentContent = '';

  for (const chunk of contentChunks) {
    currentContent += chunk;
    onUpdate({
      content: currentContent,
      reasoningContent: currentReasoning || undefined,
      isStreaming: true,
    });
    await new Promise((r) => setTimeout(r, stepDelayMs));
  }

  const totalElapsedMs = Math.max(ttftMs + 150, Math.round(performance.now() - startTime));
  const actualTokPerSec = Number(
    (model.speedTokensPerSec * (0.94 + Math.random() * 0.12)).toFixed(1)
  );
  const estimatedCostUsd = calculateCostUsd(model, promptTokens, completionTokens);

  const metrics: ModelResponseMetrics = {
    promptTokens,
    completionTokens,
    reasoningTokens,
    totalTokens: promptTokens + completionTokens,
    latencyMs: totalElapsedMs,
    ttftMs: Math.round(model.ttftSeconds * 1000),
    tokensPerSec: actualTokPerSec,
    estimatedCostUsd,
    mode: 'demo-stream',
  };

  onUpdate({
    content: fullContent,
    reasoningContent: currentReasoning || undefined,
    isStreaming: false,
    metrics,
  });

  return metrics;
}

async function callLiveProviderApi(options: {
  model: LLMModel;
  prompt: string;
  parameters: ModelParameters;
  config: ProviderConfig;
  startTime: number;
  onUpdate: (partial: {
    content: string;
    reasoningContent?: string;
    isStreaming: boolean;
    metrics?: ModelResponseMetrics;
    error?: string;
  }) => void;
}): Promise<ModelResponseMetrics> {
  const { model, prompt, parameters, config, startTime, onUpdate } = options;

  onUpdate({ content: '', isStreaming: true });

  // Anthropic native endpoint
  if (config.providerId === 'anthropic') {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model.apiModelId,
        max_tokens: parameters.maxTokens,
        temperature: parameters.temperature,
        system: parameters.systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 140)}`);
    }

    const data = await res.json();
    const text =
      data.content?.map((c: { text?: string }) => c.text || '').join('\n') || 'No content returned.';
    const promptTokens = data.usage?.input_tokens || estimateTokenCount(prompt);
    const completionTokens = data.usage?.output_tokens || estimateTokenCount(text);
    const latencyMs = Math.round(performance.now() - startTime);

    const metrics: ModelResponseMetrics = {
      promptTokens,
      completionTokens,
      reasoningTokens: 0,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      ttftMs: Math.round(latencyMs * 0.35),
      tokensPerSec: Number(((completionTokens / Math.max(latencyMs, 1)) * 1000).toFixed(1)),
      estimatedCostUsd: calculateCostUsd(model, promptTokens, completionTokens),
      mode: 'live-api',
    };

    onUpdate({ content: text, isStreaming: false, metrics });
    return metrics;
  }

  // Google Gemini native endpoint
  if (config.providerId === 'google') {
    const url = `${config.baseUrl.replace(/\/$/, '')}/models/${model.apiModelId}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: parameters.systemPrompt
          ? { parts: [{ text: parameters.systemPrompt }] }
          : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: parameters.temperature,
          maxOutputTokens: parameters.maxTokens,
          topP: parameters.topP,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 140)}`);
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('\n') ||
      'No content returned.';
    const promptTokens = data.usageMetadata?.promptTokenCount || estimateTokenCount(prompt);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || estimateTokenCount(text);
    const latencyMs = Math.round(performance.now() - startTime);

    const metrics: ModelResponseMetrics = {
      promptTokens,
      completionTokens,
      reasoningTokens: 0,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      ttftMs: Math.round(latencyMs * 0.3),
      tokensPerSec: Number(((completionTokens / Math.max(latencyMs, 1)) * 1000).toFixed(1)),
      estimatedCostUsd: calculateCostUsd(model, promptTokens, completionTokens),
      mode: 'live-api',
    };

    onUpdate({ content: text, isStreaming: false, metrics });
    return metrics;
  }

  // OpenAI-compatible endpoint (OpenAI, DeepSeek, OpenRouter, Groq, Ollama)
  const targetModel =
    config.providerId === 'openrouter' ? `${model.provider}/${model.id}` : model.apiModelId;

  const messages = [];
  if (parameters.systemPrompt.trim()) {
    messages.push({ role: 'system', content: parameters.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages,
      temperature: parameters.temperature,
      max_tokens: parameters.maxTokens,
      top_p: parameters.topP,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${config.name} HTTP ${res.status}: ${errText.slice(0, 140)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  const text = choice?.content || 'No content returned.';
  const reasoningContent = choice?.reasoning_content || undefined;
  const promptTokens = data.usage?.prompt_tokens || estimateTokenCount(prompt);
  const completionTokens = data.usage?.completion_tokens || estimateTokenCount(text);
  const latencyMs = Math.round(performance.now() - startTime);

  const metrics: ModelResponseMetrics = {
    promptTokens,
    completionTokens,
    reasoningTokens: reasoningContent ? estimateTokenCount(reasoningContent) : 0,
    totalTokens: promptTokens + completionTokens,
    latencyMs,
    ttftMs: Math.round(latencyMs * 0.32),
    tokensPerSec: Number(((completionTokens / Math.max(latencyMs, 1)) * 1000).toFixed(1)),
    estimatedCostUsd: calculateCostUsd(model, promptTokens, completionTokens),
    mode: 'live-api',
  };

  onUpdate({
    content: text,
    reasoningContent,
    isStreaming: false,
    metrics,
  });

  return metrics;
}
