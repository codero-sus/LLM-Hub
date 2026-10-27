import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  Cpu,
  DollarSign,
  KeyRound,
  Layers,
  MessageSquare,
  Radio,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';
import {
  ChatThread,
  PromptTemplate,
  ProviderConfig,
  RequestLogEntry,
} from './types/llm';
import {
  DEFAULT_PROVIDER_CONFIGS,
  INITIAL_REQUEST_LOGS,
  LLM_MODELS,
} from './data/models';
import { DEFAULT_PROMPT_TEMPLATES } from './data/prompts';
import { PlaygroundView } from './components/PlaygroundView';
import { DirectoryView } from './components/DirectoryView';
import { PromptLibraryView } from './components/PromptLibraryView';
import { GatewayDashboardView } from './components/GatewayDashboardView';
import { streamModelCompletion } from './services/llmEngine';

type ActiveTab = 'playground' | 'directory' | 'prompts' | 'gateway';

const INITIAL_DEMO_THREAD: ChatThread = {
  id: 'thread-initial-compare',
  title: 'Distributed Rate Limiter: Claude 3.7 vs DeepSeek-R1',
  createdAt: 'Today',
  updatedAt: '2 mins ago',
  mode: 'compare',
  selectedModelIds: ['claude-3-7-sonnet', 'deepseek-r1'],
  parameters: {
    systemPrompt:
      'You are a Principal Distributed Systems Architect. Provide concrete capacity math, latency budgets, and clean atomic Redis Lua + TypeScript code.',
    temperature: 0.2,
    maxTokens: 4096,
    topP: 0.95,
    reasoningEffort: 'high',
  },
  turns: [
    {
      id: 'turn-seed-1',
      timestamp: '10:42 AM',
      userPrompt:
        'Design a distributed sliding-window rate limiter handling 250,000 RPS across 12 edge regions with p99 < 4ms. Include capacity math and atomic Redis Lua + TypeScript code.',
      responses: {
        'claude-3-7-sonnet': {
          modelId: 'claude-3-7-sonnet',
          reasoningContent: `[Claude 3.7 Sonnet Reasoning Trace • Effort: HIGH]
1. Deconstructing throughput and latency constraints: 250,000 RPS across 12 edge PoPs (~20,833 RPS/PoP) with strict p99 < 4ms.
2. Synchronous global coordination violates the 4ms budget due to speed-of-light WAN latency (60-140ms).
3. Selecting local PoP Redis Cluster executing an O(1) Sliding-Window Counter Approximation Lua script (2 integer buckets per tenant) paired with async quota gossip every 100ms.`,
          content: `### Distributed Sliding-Window Rate Limiter (Claude 3.7 Sonnet)

#### 1. Capacity & Memory Math
- **Traffic Split**: \`250,000 RPS\` across \`12 PoPs\` = **~20,833 RPS per region**.
- **O(1) Memory Footprint**: Sliding-window counter approximation stores only \`current_window\` and \`previous_window\` integers (~64 bytes/key) instead of an \`O(N)\` timestamp ZSET.
- **Latency Budget (\`p99 < 4ms\`)**: Edge Worker → Local Redis (\`0.6ms\`) + Atomic Lua execution (\`0.15ms\`) = **\`1.35ms p99\`**.

\`\`\`typescript
const SLIDING_WINDOW_LUA = \`
  local curr_key = KEYS[1]
  local prev_key = KEYS[2]
  local limit = tonumber(ARGV[1])
  local window_ms = tonumber(ARGV[2])
  local now_ms = tonumber(ARGV[3])

  local curr = tonumber(redis.call('GET', curr_key) or '0')
  local prev = tonumber(redis.call('GET', prev_key) or '0')
  local weight = 1 - ((now_ms % window_ms) / window_ms)
  local estimate = math.floor(prev * weight + curr)

  if estimate + 1 > limit then
    return { 0, estimate }
  end
  redis.call('INCR', curr_key)
  redis.call('PEXPIRE', curr_key, window_ms * 2)
  return { 1, estimate + 1 }
\`;
\`\`\``,
          isStreaming: false,
          metrics: {
            promptTokens: 214,
            completionTokens: 642,
            reasoningTokens: 118,
            totalTokens: 856,
            latencyMs: 1840,
            ttftMs: 650,
            tokensPerSec: 79.4,
            estimatedCostUsd: 0.01027,
            mode: 'demo-stream',
          },
        },
        'deepseek-r1': {
          modelId: 'deepseek-r1',
          reasoningContent: `[DeepSeek-R1 (671B) Reasoning Trace • Effort: HIGH]
1. Analyzing the sliding window boundary discontinuity problem: fixed windows allow 2x burst at window edges.
2. Formulating weighted linear interpolation: E = prev_count * (1 - t/W) + curr_count.
3. Verifying failure mode when a PoP Redis shard degrades: local isolate Token Bucket L1 fallback prevents cascading 5xx errors while bounding drift to <1.5%.`,
          content: `### Hybrid Edge-Local Rate Limiter Blueprint (DeepSeek-R1)

#### 1. Mathematical Invariant & Drift Bound
To prevent the **2x boundary burst** of fixed counters without incurring \`O(log N)\` ZSET overhead, we compute the weighted sliding estimate:
- **Formula**: \`Estimated = floor(PrevWindow * (1 - elapsedRatio) + CurrWindow)\`
- **Cost Advantage**: Running on DeepSeek-R1 costs **$0.55/1M input** and **$2.19/1M output** (83% lower cost than proprietary equivalents).

\`\`\`typescript
export async function enforceEdgeRateLimit(
  redisClient: { eval: (...args: unknown[]) => Promise<[number, number]> },
  tenantKey: string,
  maxRps = 5000
) {
  const now = Date.now();
  const windowMs = 1000;
  const bucket = Math.floor(now / windowMs);

  const [allowed, activeCount] = await redisClient.eval(
    SLIDING_WINDOW_LUA,
    2,
    \`ratelimit:\${tenantKey}:\${bucket}\`,
    \`ratelimit:\${tenantKey}:\${bucket - 1}\`,
    maxRps,
    windowMs,
    now
  );

  return { allowed: allowed === 1, remaining: Math.max(0, maxRps - activeCount) };
}
\`\`\``,
          isStreaming: false,
          metrics: {
            promptTokens: 214,
            completionTokens: 718,
            reasoningTokens: 134,
            totalTokens: 932,
            latencyMs: 2410,
            ttftMs: 850,
            tokensPerSec: 64.2,
            estimatedCostUsd: 0.00169,
            mode: 'demo-stream',
          },
        },
      },
    },
  ],
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('llm_hub_threads_v1');
      return saved ? JSON.parse(saved) : [INITIAL_DEMO_THREAD];
    } catch {
      return [INITIAL_DEMO_THREAD];
    }
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id || 'thread-initial-compare');

  const [templates, setTemplates] = useState<PromptTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('llm_hub_templates_v1');
      return saved ? JSON.parse(saved) : DEFAULT_PROMPT_TEMPLATES;
    } catch {
      return DEFAULT_PROMPT_TEMPLATES;
    }
  });

  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() => {
    try {
      const saved = localStorage.getItem('llm_hub_providers_v1');
      return saved ? JSON.parse(saved) : DEFAULT_PROVIDER_CONFIGS;
    } catch {
      return DEFAULT_PROVIDER_CONFIGS;
    }
  });

  const [preferLiveApi, setPreferLiveApi] = useState<boolean>(true);

  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('llm_hub_logs_v1');
      return saved ? JSON.parse(saved) : INITIAL_REQUEST_LOGS;
    } catch {
      return INITIAL_REQUEST_LOGS;
    }
  });

  const [arenaScores, setArenaScores] = useState<
    Record<string, { wins: number; ties: number; battles: number; eloDelta: number }>
  >(() => {
    try {
      const saved = localStorage.getItem('llm_hub_arena_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('llm_hub_threads_v1', JSON.stringify(threads));
    } catch {}
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem('llm_hub_templates_v1', JSON.stringify(templates));
    } catch {}
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem('llm_hub_providers_v1', JSON.stringify(providerConfigs));
    } catch {}
  }, [providerConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem('llm_hub_logs_v1', JSON.stringify(requestLogs));
    } catch {}
  }, [requestLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('llm_hub_arena_v1', JSON.stringify(arenaScores));
    } catch {}
  }, [arenaScores]);

  const handleLogRequest = (entry: RequestLogEntry) => {
    setRequestLogs((prev) => [entry, ...prev]);
  };

  const handleRecordArenaVote = (
    modelA: string,
    modelB: string,
    winner: 'A' | 'B' | 'tie' | 'both_bad'
  ) => {
    setArenaScores((prev) => {
      const curA = prev[modelA] || { wins: 0, ties: 0, battles: 0, eloDelta: 0 };
      const curB = prev[modelB] || { wins: 0, ties: 0, battles: 0, eloDelta: 0 };

      const deltaA = winner === 'A' ? 16 : winner === 'B' ? -12 : winner === 'tie' ? 4 : -4;
      const deltaB = winner === 'B' ? 16 : winner === 'A' ? -12 : winner === 'tie' ? 4 : -4;

      return {
        ...prev,
        [modelA]: {
          wins: curA.wins + (winner === 'A' ? 1 : 0),
          ties: curA.ties + (winner === 'tie' ? 1 : 0),
          battles: curA.battles + 1,
          eloDelta: curA.eloDelta + deltaA,
        },
        [modelB]: {
          wins: curB.wins + (winner === 'B' ? 1 : 0),
          ties: curB.ties + (winner === 'tie' ? 1 : 0),
          battles: curB.battles + 1,
          eloDelta: curB.eloDelta + deltaB,
        },
      };
    });
  };

  // Launch selected models from Directory into Playground
  const handleOpenInPlayground = (modelIds: string[], mode: 'single' | 'compare') => {
    const newId = `thread-${Date.now()}`;
    const names = modelIds
      .map((id) => LLM_MODELS.find((m) => m.id === id)?.name || id)
      .join(' vs ');
    const newThread: ChatThread = {
      id: newId,
      title: mode === 'single' ? `Chat: ${names}` : `Compare: ${names}`,
      createdAt: 'Just now',
      updatedAt: 'Just now',
      mode,
      selectedModelIds: modelIds,
      parameters: {
        systemPrompt:
          'You are a Principal AI & Distributed Systems Architect. Provide clear, rigorous technical responses.',
        temperature: 0.2,
        maxTokens: 4096,
        topP: 0.95,
        reasoningEffort: 'high',
      },
      turns: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setActiveTab('playground');
  };

  // Launch compiled prompt from Prompt Library directly into Playground and start streaming
  const handleRunPromptInPlayground = async (options: {
    compiledPrompt: string;
    systemPrompt: string;
    modelIds: string[];
    mode: 'single' | 'compare';
  }) => {
    const threadId = `thread-${Date.now()}`;
    const turnId = `turn-${Date.now()}`;
    const initialResponses: ChatThread['turns'][0]['responses'] = {};
    options.modelIds.forEach((mId) => {
      initialResponses[mId] = {
        modelId: mId,
        content: '',
        isStreaming: true,
      };
    });

    const params = {
      systemPrompt: options.systemPrompt,
      temperature: 0.2,
      maxTokens: 4096,
      topP: 0.95,
      reasoningEffort: 'high' as const,
    };

    const newThread: ChatThread = {
      id: threadId,
      title: options.compiledPrompt.slice(0, 44) + '...',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      mode: options.mode,
      selectedModelIds: options.modelIds,
      parameters: params,
      turns: [
        {
          id: turnId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          userPrompt: options.compiledPrompt,
          responses: initialResponses,
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(threadId);
    setActiveTab('playground');

    await Promise.all(
      options.modelIds.map(async (mId) => {
        const modelObj = LLM_MODELS.find((m) => m.id === mId) || LLM_MODELS[0];
        const metrics = await streamModelCompletion({
          model: modelObj,
          prompt: options.compiledPrompt,
          parameters: params,
          providerConfigs,
          preferLiveApi,
          onUpdate: (partial) => {
            setThreads((prev) =>
              prev.map((t) => {
                if (t.id !== threadId) return t;
                return {
                  ...t,
                  turns: t.turns.map((turn) => {
                    if (turn.id !== turnId) return turn;
                    return {
                      ...turn,
                      responses: {
                        ...turn.responses,
                        [mId]: {
                          modelId: mId,
                          content: partial.content,
                          reasoningContent: partial.reasoningContent,
                          isStreaming: partial.isStreaming,
                          metrics: partial.metrics,
                        },
                      },
                    };
                  }),
                };
              })
            );
          },
        });

        handleLogRequest({
          id: `req-${Date.now()}-${mId.slice(0, 4)}`,
          timestamp: 'Just now',
          modelId: modelObj.id,
          modelName: modelObj.name,
          provider: modelObj.provider,
          promptPreview: options.compiledPrompt.slice(0, 90),
          promptTokens: metrics.promptTokens,
          completionTokens: metrics.completionTokens,
          totalTokens: metrics.totalTokens,
          costUsd: metrics.estimatedCostUsd,
          latencyMs: metrics.latencyMs,
          tokensPerSec: metrics.tokensPerSec,
          mode: metrics.mode,
          status: 'success',
        });
      })
    );
  };

  const totalTokensUsed = requestLogs.reduce((acc, r) => acc + r.totalTokens, 0);
  const totalCostUsd = requestLogs.reduce((acc, r) => acc + r.costUsd, 0);
  const liveKeysCount = providerConfigs.filter((c) => c.apiKey.trim().length > 3).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Global Navigation Bar */}
      <header className="h-16 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">LLM-Hub</span>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                v2.5 Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Model Arena • Benchmark Explorer • Prompt Studio • API Gateway
            </p>
          </div>
        </div>

        {/* Center Workspace Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Playground & Arena</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'directory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Models & Benchmarks</span>
            <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-950/60 text-indigo-200 font-mono">
              {LLM_MODELS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'prompts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Prompt Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gateway'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>API Gateway & Telemetry</span>
          </button>
        </nav>

        {/* Right Telemetry & Mode Status Pill */}
        <div className="hidden xl:flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              {(totalTokensUsed / 1000).toFixed(1)}k tok
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-0.5 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              {totalCostUsd.toFixed(4)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              liveKeysCount > 0 && preferLiveApi
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
            }`}
            title="Click to configure BYOK API Keys or toggle Demo Stream mode"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>
              {liveKeysCount > 0 && preferLiveApi
                ? `BYOK Live (${liveKeysCount} Keys)`
                : 'Demo Stream + BYOK Ready'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'playground' && (
          <PlaygroundView
            models={LLM_MODELS}
            threads={threads}
            activeThreadId={activeThreadId}
            setActiveThreadId={setActiveThreadId}
            onUpdateThreads={setThreads}
            providerConfigs={providerConfigs}
            preferLiveApi={preferLiveApi}
            onLogRequest={handleLogRequest}
            arenaScores={arenaScores}
            onRecordArenaVote={handleRecordArenaVote}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            models={LLM_MODELS}
            arenaScores={arenaScores}
            onOpenInPlayground={handleOpenInPlayground}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptLibraryView
            templates={templates}
            models={LLM_MODELS}
            onUpdateTemplates={setTemplates}
            onRunPromptInPlayground={handleRunPromptInPlayground}
          />
        )}

        {activeTab === 'gateway' && (
          <GatewayDashboardView
            models={LLM_MODELS}
            providerConfigs={providerConfigs}
            onUpdateProviderConfigs={setProviderConfigs}
            preferLiveApi={preferLiveApi}
            onTogglePreferLiveApi={setPreferLiveApi}
            requestLogs={requestLogs}
            onClearLogs={() => setRequestLogs([])}
          />
        )}
      </main>
    </div>
  );
}

export default App;
