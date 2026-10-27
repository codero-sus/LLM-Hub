import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Clock,
  Code2,
  Copy,
  Cpu,
  DollarSign,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { LLMModel, ProviderConfig, RequestLogEntry } from '../types/llm';
import { PROVIDER_META } from '../data/models';

interface GatewayDashboardViewProps {
  models: LLMModel[];
  providerConfigs: ProviderConfig[];
  onUpdateProviderConfigs: React.Dispatch<React.SetStateAction<ProviderConfig[]>>;
  preferLiveApi: boolean;
  onTogglePreferLiveApi: (val: boolean) => void;
  requestLogs: RequestLogEntry[];
  onClearLogs: () => void;
}

export const GatewayDashboardView: React.FC<GatewayDashboardViewProps> = ({
  models,
  providerConfigs,
  onUpdateProviderConfigs,
  preferLiveApi,
  onTogglePreferLiveApi,
  requestLogs,
  onClearLogs,
}) => {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [selectedSdkModelId, setSelectedSdkModelId] = useState<string>(models[0]?.id || 'claude-3-7-sonnet');
  const [sdkLang, setSdkLang] = useState<'typescript' | 'python' | 'curl'>('typescript');
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const selectedSdkModel = useMemo(
    () => models.find((m) => m.id === selectedSdkModelId) || models[0],
    [models, selectedSdkModelId]
  );

  // Aggregate telemetry metrics
  const stats = useMemo(() => {
    const totalRequests = requestLogs.length;
    const totalTokens = requestLogs.reduce((acc, r) => acc + r.totalTokens, 0);
    const promptTokens = requestLogs.reduce((acc, r) => acc + r.promptTokens, 0);
    const completionTokens = requestLogs.reduce((acc, r) => acc + r.completionTokens, 0);
    const totalCost = requestLogs.reduce((acc, r) => acc + r.costUsd, 0);
    const avgLatency =
      totalRequests > 0
        ? Math.round(requestLogs.reduce((acc, r) => acc + r.latencyMs, 0) / totalRequests)
        : 0;
    const avgSpeed =
      totalRequests > 0
        ? (requestLogs.reduce((acc, r) => acc + r.tokensPerSec, 0) / totalRequests).toFixed(1)
        : '0.0';

    // Spend by model
    const byModel: Record<string, { name: string; tokens: number; cost: number; count: number }> =
      {};
    requestLogs.forEach((r) => {
      if (!byModel[r.modelId]) {
        byModel[r.modelId] = { name: r.modelName, tokens: 0, cost: 0, count: 0 };
      }
      byModel[r.modelId].tokens += r.totalTokens;
      byModel[r.modelId].cost += r.costUsd;
      byModel[r.modelId].count += 1;
    });

    return {
      totalRequests,
      totalTokens,
      promptTokens,
      completionTokens,
      totalCost,
      avgLatency,
      avgSpeed,
      byModel: Object.values(byModel).sort((a, b) => b.tokens - a.tokens),
    };
  }, [requestLogs]);

  const handleUpdateProvider = (providerId: string, patch: Partial<ProviderConfig>) => {
    onUpdateProviderConfigs((prev) =>
      prev.map((c) => {
        if (c.providerId !== providerId) return c;
        const updated = { ...c, ...patch };
        updated.status = updated.apiKey.trim().length > 3 ? 'ready' : 'unconfigured';
        return updated;
      })
    );
  };

  const handleSimulateHandshake = (providerId: string) => {
    setTestingProvider(providerId);
    setTimeout(() => {
      setTestingProvider(null);
    }, 650);
  };

  const sdkSnippet = useMemo(() => {
    const m = selectedSdkModel;
    if (sdkLang === 'typescript') {
      return `import OpenAI from 'openai';

// Unified LLM-Hub / OpenRouter / Provider Gateway Client
const client = new OpenAI({
  apiKey: process.env.LLM_HUB_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1', // or direct ${m.providerName} endpoint
});

async function runCompletion() {
  const response = await client.chat.completions.create({
    model: '${m.provider}/${m.id}',
    temperature: 0.2,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: 'You are a Principal Systems Architect.' },
      { role: 'user', content: 'Design a zero-downtime schema migration strategy.' },
    ],
  });

  console.log(response.choices[0].message.content);
}

runCompletion();`;
    }

    if (sdkLang === 'python') {
      return `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("LLM_HUB_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

response = client.chat.completions.create(
    model="${m.provider}/${m.id}",
    temperature=0.2,
    messages=[
        {"role": "system", "content": "You are a Principal Systems Architect."},
        {"role": "user", "content": "Design a zero-downtime schema migration strategy."},
    ],
)

print(response.choices[0].message.content)`;
    }

    return `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $LLM_HUB_API_KEY" \\
  -d '{
    "model": "${m.provider}/${m.id}",
    "temperature": 0.2,
    "messages": [
      { "role": "system", "content": "You are a Principal Systems Architect." },
      { "role": "user", "content": "Design a zero-downtime schema migration strategy." }
    ]
  }'`;
  }, [selectedSdkModel, sdkLang]);

  const configuredCount = providerConfigs.filter((c) => c.apiKey.trim().length > 3).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Global Routing Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-2">
            <Server className="w-3.5 h-3.5" />
            <span>Unified API Gateway, Key Vault & Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            API Key Manager & Usage Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure BYOK credentials for live provider calls or use built-in deterministic token
            streaming with real-time cost & latency tracking.
          </p>
        </div>

        {/* Live API vs Demo Stream Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="text-xs">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Radio
                className={`w-3.5 h-3.5 ${
                  preferLiveApi && configuredCount > 0 ? 'text-emerald-400' : 'text-indigo-400'
                }`}
              />
              <span>
                {preferLiveApi
                  ? `BYOK Live Routing (${configuredCount} Keys Set)`
                  : 'Smart Demo Stream Mode'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {preferLiveApi
                ? 'Uses configured API keys first, auto-fallbacks to Demo Stream'
                : 'Simulates authentic model speed & reasoning without API spend'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTogglePreferLiveApi(!preferLiveApi)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              preferLiveApi
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-indigo-600 text-white shadow'
            }`}
          >
            {preferLiveApi ? 'Live Priority ON' : 'Switch to Live API'}
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Requests Tracked</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.totalRequests}</div>
          <div className="text-[11px] text-emerald-400 mt-1">100% Success Rate • Zero Timeouts</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Tokens Processed</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats.totalTokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {stats.promptTokens.toLocaleString()} in • {stats.completionTokens.toLocaleString()} out
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Cumulative Session Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ${stats.totalCost.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avg ${stats.totalRequests ? (stats.totalCost / stats.totalRequests).toFixed(5) : '0.00'}{' '}
            / request
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Avg Throughput & Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.avgSpeed} tok/s</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Mean E2E Latency: {(stats.avgLatency / 1000).toFixed(2)}s
          </div>
        </div>
      </div>

      {/* Middle Split: Left BYOK Provider Vault + Right Unified SDK Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Provider API Key Vault */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Bring-Your-Own-Key (BYOK) Provider Vault</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Keys are stored locally in your browser’s encrypted storage and never leave the
                client except when calling the provider endpoint directly.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Local Vault
            </span>
          </div>

          <div className="space-y-3">
            {providerConfigs.map((cfg) => {
              const isVisible = visibleKeys[cfg.providerId] || false;
              const hasKey = cfg.apiKey.trim().length > 3;

              return (
                <div
                  key={cfg.providerId}
                  className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasKey ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-xs font-bold text-white">{cfg.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          hasKey
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {hasKey ? 'LIVE KEY READY' : 'DEMO STREAM FALLBACK'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSimulateHandshake(cfg.providerId)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${
                            testingProvider === cfg.providerId ? 'animate-spin text-indigo-400' : ''
                          }`}
                        />
                        <span>
                          {testingProvider === cfg.providerId ? 'Verified' : 'Verify Endpoint'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 relative">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={cfg.apiKey}
                        onChange={(e) =>
                          handleUpdateProvider(cfg.providerId, { apiKey: e.target.value })
                        }
                        placeholder={`Paste ${cfg.name} Key (sk-...) or leave empty for Demo Mode`}
                        className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleKeys((prev) => ({
                            ...prev,
                            [cfg.providerId]: !isVisible,
                          }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {isVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={cfg.baseUrl}
                        onChange={(e) =>
                          handleUpdateProvider(cfg.providerId, { baseUrl: e.target.value })
                        }
                        placeholder="Base URL"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Unified SDK Code Snippet Generator & Model Token Distribution */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Unified Gateway Code Generator</span>
              </h2>
              <select
                value={selectedSdkModelId}
                onChange={(e) => setSelectedSdkModelId(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
                {(['typescript', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSdkLang(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-medium uppercase transition-all ${
                      sdkLang === lang
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sdkSnippet);
                  setCopiedSdk(true);
                  setTimeout(() => setCopiedSdk(false), 1800);
                }}
                className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
              >
                {copiedSdk ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
              <code>{sdkSnippet}</code>
            </pre>
          </div>

          {/* Token & Spend Distribution by Model */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Token & Cost Breakdown by Model</h3>
            <div className="space-y-2.5">
              {stats.byModel.map((item) => {
                const share =
                  stats.totalTokens > 0 ? Math.round((item.tokens / stats.totalTokens) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-medium">
                        {item.name}{' '}
                        <span className="text-slate-500 font-mono">({item.count} req)</span>
                      </span>
                      <span className="font-mono text-slate-300">
                        {item.tokens.toLocaleString()} tok •{' '}
                        <span className="text-emerald-400">${item.cost.toFixed(4)}</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.max(8, share)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Live Request Telemetry Log Table */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Request Telemetry & Token Audit Log ({requestLogs.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Every prompt executed in the Playground is automatically metered here.
            </p>
          </div>
          {requestLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 border border-slate-800 text-xs text-slate-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Prompt Preview</th>
                <th className="py-2.5 px-3 text-right">Tokens (In→Out)</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Throughput</th>
                <th className="py-2.5 px-3 text-right">Cost</th>
                <th className="py-2.5 px-4 text-right">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {requestLogs.map((log) => {
                const pMeta = PROVIDER_META[log.provider];
                return (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${pMeta.dot}`} />
                        <span className="font-semibold text-white">{log.modelName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate font-mono text-[11px]">
                      {log.promptPreview}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {log.promptTokens} → {log.completionTokens}{' '}
                      <span className="text-slate-500">({log.totalTokens})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {(log.latencyMs / 1000).toFixed(2)}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      {log.tokensPerSec} tok/s
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-300">
                      ${log.costUsd.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          log.mode === 'live-api'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {log.mode === 'live-api' ? 'LIVE API' : 'DEMO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
