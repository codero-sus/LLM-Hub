import React, { useState } from 'react';
import {
  Bot,
  Check,
  Clock,
  Columns,
  Copy,
  Cpu,
  DollarSign,
  Download,
  Eye,
  Flame,
  History,
  Layers,
  MessageSquarePlus,
  Plus,
  Send,
  Sliders,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  ChatThread,
  ChatTurn,
  LLMModel,
  ModelParameters,
  ProviderConfig,
  RequestLogEntry,
} from '../types/llm';
import { PROVIDER_META } from '../data/models';
import { streamModelCompletion } from '../services/llmEngine';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PlaygroundViewProps {
  models: LLMModel[];
  threads: ChatThread[];
  activeThreadId: string;
  setActiveThreadId: (id: string) => void;
  onUpdateThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  providerConfigs: ProviderConfig[];
  preferLiveApi: boolean;
  onLogRequest: (entry: RequestLogEntry) => void;
  arenaScores: Record<string, { wins: number; ties: number; battles: number; eloDelta: number }>;
  onRecordArenaVote: (modelA: string, modelB: string, winner: 'A' | 'B' | 'tie' | 'both_bad') => void;
}

const STARTER_PROMPTS = [
  {
    label: 'Distributed Rate Limiter (Redis + Lua)',
    prompt:
      'Design a distributed sliding-window rate limiter handling 250,000 RPS across 12 edge regions with p99 < 4ms. Include capacity math and atomic Redis Lua + TypeScript code.',
  },
  {
    label: 'Zero-Trust Webhook Security Audit',
    prompt: `Perform a security audit on this Express webhook handler and provide a hardened patch:\n\`\`\`javascript\napp.post('/api/webhook/payment', async (req, res) => {\n  const sig = req.headers['x-signature'];\n  const expected = crypto.createHmac('sha256', SECRET).update(JSON.stringify(req.body)).digest('hex');\n  if (sig == expected) {\n    const user = await db.query(\`SELECT * FROM accounts WHERE id = '\${req.body.userId}'\`);\n    await fetch(req.body.callbackUrl, { method: 'POST', body: JSON.stringify(user) });\n    return res.status(200).send({ ok: true });\n  }\n});\n\`\`\``,
  },
  {
    label: 'PostgreSQL 180M-Row Query Tuning',
    prompt:
      "Optimize a slow PostgreSQL 17 analytical query scanning 180M rows in llm_request_logs where LOWER(status) = 'success' and metadata->>'workspace_tier' = 'enterprise'. Provide covering index DDL and rewritten SQL.",
  },
  {
    label: 'Invoice JSON Discrepancy Extractor',
    prompt:
      'Extract strict JSON line items and verify arithmetic discrepancies from: "INV #9941-B from CloudScale Systems Inc. dated March 14th, 2025. 4x Dedicated H100 Nodes @ $4,250/mo = $17,000. 12TB NVMe @ $120/TB = $1,440. Support = $850. Grand Total billed: $19,590 USD."',
  },
];

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  models,
  threads,
  activeThreadId,
  setActiveThreadId,
  onUpdateThreads,
  providerConfigs,
  preferLiveApi,
  onLogRequest,
  arenaScores,
  onRecordArenaVote,
}) => {
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const [inputPrompt, setInputPrompt] = useState('');
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [showParamsDrawer, setShowParamsDrawer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const updateActiveThread = (updater: (thread: ChatThread) => ChatThread) => {
    onUpdateThreads((prev) =>
      prev.map((t) => (t.id === activeThread.id ? updater(t) : t))
    );
  };

  const handleModeChange = (newMode: 'single' | 'compare' | 'arena') => {
    updateActiveThread((t) => {
      let nextModels = [...t.selectedModelIds];
      if (newMode === 'single') {
        nextModels = [nextModels[0] || 'claude-3-7-sonnet'];
      } else if (newMode === 'compare' && nextModels.length < 2) {
        nextModels = ['claude-3-7-sonnet', 'deepseek-r1', 'gemini-2.5-pro'];
      } else if (newMode === 'arena') {
        // Pick two random distinct models for blind battle
        const shuffled = [...models].sort(() => Math.random() - 0.5);
        nextModels = [shuffled[0].id, shuffled[1].id];
      }
      return {
        ...t,
        mode: newMode,
        selectedModelIds: nextModels,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
  };

  const handleSelectModelSlot = (slotIdx: number, modelId: string) => {
    updateActiveThread((t) => {
      const updated = [...t.selectedModelIds];
      updated[slotIdx] = modelId;
      return { ...t, selectedModelIds: updated };
    });
  };

  const handleAddModelSlot = () => {
    if (activeThread.selectedModelIds.length >= 4) return;
    const unused = models.find((m) => !activeThread.selectedModelIds.includes(m.id)) || models[0];
    updateActiveThread((t) => ({
      ...t,
      selectedModelIds: [...t.selectedModelIds, unused.id],
    }));
  };

  const handleRemoveModelSlot = (slotIdx: number) => {
    if (activeThread.selectedModelIds.length <= 1) return;
    updateActiveThread((t) => ({
      ...t,
      selectedModelIds: t.selectedModelIds.filter((_, idx) => idx !== slotIdx),
    }));
  };

  const handleCreateNewThread = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: 'New Multi-Model Session',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      mode: activeThread.mode,
      selectedModelIds: [...activeThread.selectedModelIds],
      parameters: { ...activeThread.parameters },
      turns: [],
    };
    onUpdateThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
  };

  const handleDeleteThread = (id: string) => {
    if (threads.length <= 1) {
      updateActiveThread((t) => ({ ...t, turns: [], title: 'New Multi-Model Session' }));
      return;
    }
    const remaining = threads.filter((t) => t.id !== id);
    onUpdateThreads(remaining);
    if (activeThreadId === id) {
      setActiveThreadId(remaining[0].id);
    }
  };

  const handleUpdateParams = (patch: Partial<ModelParameters>) => {
    updateActiveThread((t) => ({
      ...t,
      parameters: { ...t.parameters, ...patch },
    }));
  };

  const handleSendPrompt = async (overridePrompt?: string) => {
    const promptText = (overridePrompt ?? inputPrompt).trim();
    if (!promptText || isGenerating) return;
    if (!overridePrompt) setInputPrompt('');

    setIsGenerating(true);

    // Determine target models (for arena mode, pick 2 random distinct models per turn if desired)
    let targetModelIds = [...activeThread.selectedModelIds];
    if (activeThread.mode === 'arena' && targetModelIds.length !== 2) {
      const shuffled = [...models].sort(() => Math.random() - 0.5);
      targetModelIds = [shuffled[0].id, shuffled[1].id];
    }

    const turnId = `turn-${Date.now()}`;
    const initialResponses: ChatTurn['responses'] = {};
    targetModelIds.forEach((mId) => {
      initialResponses[mId] = {
        modelId: mId,
        content: '',
        isStreaming: true,
      };
    });

    const newTurn: ChatTurn = {
      id: turnId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userPrompt: promptText,
      responses: initialResponses,
      arenaBattle:
        activeThread.mode === 'arena'
          ? {
              modelA: targetModelIds[0],
              modelB: targetModelIds[1],
              revealed: false,
            }
          : undefined,
    };

    const threadId = activeThread.id;
    const currentParams = activeThread.parameters;

    onUpdateThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        const isFirstTurn = t.turns.length === 0;
        return {
          ...t,
          title: isFirstTurn ? promptText.slice(0, 42) + (promptText.length > 42 ? '...' : '') : t.title,
          updatedAt: 'Just now',
          selectedModelIds: targetModelIds,
          turns: [...t.turns, newTurn],
        };
      })
    );

    // Stream all selected models in parallel!
    await Promise.all(
      targetModelIds.map(async (mId) => {
        const modelObj = models.find((m) => m.id === mId) || models[0];
        const metrics = await streamModelCompletion({
          model: modelObj,
          prompt: promptText,
          parameters: currentParams,
          providerConfigs,
          preferLiveApi,
          onUpdate: (partial) => {
            onUpdateThreads((prev) =>
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
                          error: partial.error,
                        },
                      },
                    };
                  }),
                };
              })
            );
          },
        });

        onLogRequest({
          id: `req-${Date.now()}-${mId.slice(0, 4)}`,
          timestamp: 'Just now',
          modelId: modelObj.id,
          modelName: modelObj.name,
          provider: modelObj.provider,
          promptPreview: promptText.slice(0, 90),
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

    setIsGenerating(false);
  };

  const handleVoteArena = (turnId: string, winner: 'A' | 'B' | 'tie' | 'both_bad') => {
    const turn = activeThread.turns.find((t) => t.id === turnId);
    if (!turn?.arenaBattle || turn.arenaBattle.revealed) return;

    onRecordArenaVote(turn.arenaBattle.modelA, turn.arenaBattle.modelB, winner);

    updateActiveThread((t) => ({
      ...t,
      turns: t.turns.map((item) =>
        item.id === turnId && item.arenaBattle
          ? {
              ...item,
              arenaBattle: {
                ...item.arenaBattle,
                revealed: true,
                winner,
              },
            }
          : item
      ),
    }));
  };

  const handleExportThread = () => {
    const lines: string[] = [
      `# ${activeThread.title}`,
      `Exported from LLM-Hub • Mode: ${activeThread.mode.toUpperCase()}`,
      '',
    ];
    activeThread.turns.forEach((turn, idx) => {
      lines.push(`## Turn ${idx + 1} (${turn.timestamp})`);
      lines.push(`**User Prompt:**\n${turn.userPrompt}\n`);
      Object.values(turn.responses).forEach((resp) => {
        const m = models.find((x) => x.id === resp.modelId);
        lines.push(`### ${m?.name || resp.modelId}`);
        if (resp.metrics) {
          lines.push(
            `*Metrics: ${resp.metrics.totalTokens} tokens • ${resp.metrics.latencyMs}ms • ${resp.metrics.tokensPerSec} tok/s • $${resp.metrics.estimatedCostUsd}*`
          );
        }
        lines.push(resp.content + '\n');
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeThread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyResponse = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Left Sidebar: Saved Threads & Arena Standings */}
      {showHistorySidebar && (
        <aside className="w-72 flex-shrink-0 border-r border-slate-800/80 bg-slate-900/40 flex flex-col">
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCreateNewThread}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Workspace Sessions ({threads.length})</span>
            </div>
            {threads.map((thread) => {
              const isSelected = thread.id === activeThread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-500/15 border border-indigo-500/30 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-xs font-medium truncate">{thread.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {thread.mode}
                      </span>
                      <span>{thread.selectedModelIds.length} model(s)</span>
                      <span>• {thread.turns.length} turns</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mini Blind Arena Leaderboard Widget */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/70">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Session Arena ELO
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Live Votes</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {models
                .slice()
                .sort(
                  (a, b) =>
                    b.benchmarks.arenaElo +
                    (arenaScores[b.id]?.eloDelta || 0) -
                    (a.benchmarks.arenaElo + (arenaScores[a.id]?.eloDelta || 0))
                )
                .slice(0, 5)
                .map((m, idx) => {
                  const delta = arenaScores[m.id]?.eloDelta || 0;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-950/60 border border-slate-800/60"
                    >
                      <span className="truncate text-slate-200 font-medium">
                        <span className="text-slate-400 font-mono mr-1.5">#{idx + 1}</span>
                        {m.name}
                      </span>
                      <span className="font-mono text-indigo-300 flex items-center gap-1">
                        {m.benchmarks.arenaElo + delta}
                        {delta !== 0 && (
                          <span
                            className={`text-[10px] ${
                              delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </aside>
      )}

      {/* Main Playground Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Playground Control Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistorySidebar((v) => !v)}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                showHistorySidebar
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle History Sidebar"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeThread.mode === 'single'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Single Chat</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeThread.mode === 'compare'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Multi-Model Compare (2–4)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('arena')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeThread.mode === 'arena'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Blind Arena Battle</span>
              </button>
            </div>
          </div>

          {/* Model Slot Selectors */}
          {activeThread.mode !== 'arena' ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeThread.selectedModelIds.map((mId, slotIdx) => {
                const selectedModel = models.find((m) => m.id === mId) || models[0];
                const pMeta = PROVIDER_META[selectedModel.provider];
                return (
                  <div
                    key={`${slotIdx}-${mId}`}
                    className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border ${pMeta.border} bg-slate-900/90`}
                  >
                    <span className={`w-2 h-2 rounded-full ${pMeta.dot}`} />
                    <select
                      value={mId}
                      onChange={(e) => handleSelectModelSlot(slotIdx, e.target.value)}
                      className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer pr-1"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-slate-100">
                          {m.name} ({m.providerName})
                        </option>
                      ))}
                    </select>
                    {activeThread.mode === 'compare' && activeThread.selectedModelIds.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveModelSlot(slotIdx)}
                        className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                        title="Remove model slot"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {activeThread.mode === 'compare' && activeThread.selectedModelIds.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddModelSlot}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500/60 text-xs text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Model</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Anonymous Model A vs. Model B — Vote after streaming to reveal identities!</span>
            </div>
          )}

          {/* Right Controls: System Prompt / Params & Export */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowParamsDrawer((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showParamsDrawer
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parameters</span>
              <span className="text-[10px] font-mono text-slate-400">
                T={activeThread.parameters.temperature}
              </span>
            </button>

            {activeThread.turns.length > 0 && (
              <button
                type="button"
                onClick={handleExportThread}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                title="Export conversation to Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export .MD</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible System Prompt & Hyperparameters Drawer */}
        {showParamsDrawer && (
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fadeIn">
            <div className="lg:col-span-6">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                System Prompt / Persona Instructions
              </label>
              <textarea
                rows={2}
                value={activeThread.parameters.systemPrompt}
                onChange={(e) => handleUpdateParams({ systemPrompt: e.target.value })}
                placeholder="You are a Principal Systems Architect & AI Engineer..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-indigo-300">
                    {activeThread.parameters.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={activeThread.parameters.temperature}
                  onChange={(e) => handleUpdateParams({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Max Tokens</span>
                  <span className="font-mono text-indigo-300">
                    {activeThread.parameters.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={512}
                  max={16384}
                  step={512}
                  value={activeThread.parameters.maxTokens}
                  onChange={(e) => handleUpdateParams({ maxTokens: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Top-P</span>
                  <span className="font-mono text-indigo-300">{activeThread.parameters.topP}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={activeThread.parameters.topP}
                  onChange={(e) => handleUpdateParams({ topP: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400 mb-1">Reasoning Effort</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleUpdateParams({ reasoningEffort: lvl })}
                      className={`py-1 rounded text-[10px] font-semibold uppercase transition-colors ${
                        activeThread.parameters.reasoningEffort === lvl
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeThread.turns.length === 0 ? (
            <div className="max-w-4xl mx-auto my-8 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {activeThread.mode === 'single'
                    ? 'Single-Model Deep Chat Mode'
                    : activeThread.mode === 'compare'
                    ? `Synchronized ${activeThread.selectedModelIds.length}-Model Parallel Comparison`
                    : 'Blind Side-by-Side Arena Battle Mode'}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Prompt Once. Compare Frontier LLMs in Real Time.
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                  Stream responses simultaneously with chain-of-thought reasoning traces, live token
                  velocity, latency telemetry, and automatic cost calculation.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {STARTER_PROMPTS.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendPrompt(item.prompt)}
                    className="group p-3.5 rounded-xl border border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 mb-1">
                        <span>{item.label}</span>
                        <Zap className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 font-mono">{item.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeThread.turns.map((turn) => {
              const responseEntries = Object.values(turn.responses);
              const gridCols =
                responseEntries.length === 1
                  ? 'grid-cols-1 max-w-4xl mx-auto'
                  : responseEntries.length === 2
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : responseEntries.length === 3
                  ? 'grid-cols-1 lg:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

              const isBlindArena = Boolean(turn.arenaBattle && !turn.arenaBattle.revealed);

              return (
                <div key={turn.id} className="space-y-3">
                  {/* User Prompt Banner */}
                  <div className="flex items-start gap-3 bg-slate-900/80 border border-slate-800/90 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">Prompt</span>
                        <span>{turn.timestamp}</span>
                      </div>
                      <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {turn.userPrompt}
                      </div>
                    </div>
                  </div>

                  {/* Parallel Model Output Columns */}
                  <div className={`grid ${gridCols} gap-4`}>
                    {responseEntries.map((resp, idx) => {
                      const modelObj = models.find((m) => m.id === resp.modelId) || models[0];
                      const pMeta = PROVIDER_META[modelObj.provider];
                      const anonymousLabel = idx === 0 ? 'Anonymous Model A' : 'Anonymous Model B';
                      const copyKey = `${turn.id}-${resp.modelId}`;

                      return (
                        <div
                          key={resp.modelId}
                          className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-900/40 overflow-hidden shadow-lg"
                        >
                          {/* Model Column Header */}
                          <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                            {isBlindArena ? (
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-xs font-bold text-amber-200">
                                  {anonymousLabel}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Identity Hidden
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full ${pMeta.dot}`} />
                                <span className="text-xs font-bold text-white truncate">
                                  {modelObj.name}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded border ${pMeta.badgeBg} ${pMeta.badgeText} ${pMeta.border}`}
                                >
                                  {modelObj.providerName}
                                </span>
                                {modelObj.isReasoning && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    CoT
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              {resp.metrics && (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                    resp.metrics.mode === 'live-api'
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {resp.metrics.mode === 'live-api' ? 'LIVE API' : 'DEMO STREAM'}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCopyResponse(resp.content, copyKey)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Copy response"
                              >
                                {copiedId === copyKey ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Markdown Body */}
                          <div className="p-4 flex-1 overflow-x-auto">
                            <MarkdownRenderer
                              content={resp.content}
                              reasoningContent={resp.reasoningContent}
                              isStreaming={resp.isStreaming}
                            />
                          </div>

                          {/* Telemetry Footer */}
                          {resp.metrics && (
                            <div className="px-3.5 py-2 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <Zap className="w-3 h-3" />
                                  {resp.metrics.tokensPerSec} tok/s
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {(resp.metrics.latencyMs / 1000).toFixed(2)}s
                                </span>
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-slate-500" />
                                  {resp.metrics.promptTokens}→{resp.metrics.completionTokens} tok
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-indigo-300">
                                <DollarSign className="w-3 h-3" />
                                <span>${resp.metrics.estimatedCostUsd.toFixed(5)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Blind Arena Voting Bar */}
                  {turn.arenaBattle && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3">
                      {!turn.arenaBattle.revealed ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-amber-200">
                            <Swords className="w-4 h-4 text-amber-400" />
                            <span className="font-semibold">
                              Blind Evaluation: Which model gave the superior engineering response?
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleVoteArena(turn.id, 'A')}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                            >
                              👈 Model A is Better
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoteArena(turn.id, 'B')}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                            >
                              👉 Model B is Better
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoteArena(turn.id, 'tie')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              🤝 Tie (Both Good)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoteArena(turn.id, 'both_bad')}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium transition-colors"
                            >
                              👎 Both Weak
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-emerald-300">
                            <Eye className="w-4 h-4" />
                            <span>
                              Identities Revealed!{' '}
                              <strong>
                                Model A ={' '}
                                {models.find((m) => m.id === turn.arenaBattle?.modelA)?.name}
                              </strong>{' '}
                              vs.{' '}
                              <strong>
                                Model B ={' '}
                                {models.find((m) => m.id === turn.arenaBattle?.modelB)?.name}
                              </strong>
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 font-semibold">
                            Vote Recorded:{' '}
                            {turn.arenaBattle.winner === 'A'
                              ? 'Model A Won (+16 ELO)'
                              : turn.arenaBattle.winner === 'B'
                              ? 'Model B Won (+16 ELO)'
                              : turn.arenaBattle.winner === 'tie'
                              ? 'Tie (+4 ELO each)'
                              : 'Both Flagged'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Prompt Composer */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-900/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="max-w-5xl mx-auto flex items-end gap-2.5"
          >
            <div className="flex-1 relative">
              <textarea
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder={
                  activeThread.mode === 'single'
                    ? `Message ${
                        models.find((m) => m.id === activeThread.selectedModelIds[0])?.name || 'LLM'
                      }... (Enter to send, Shift+Enter for newline)`
                    : activeThread.mode === 'compare'
                    ? `Broadcast prompt simultaneously to ${activeThread.selectedModelIds.length} models... (Enter to send)`
                    : 'Send a prompt to start a blind Model A vs. Model B battle...'
                }
                className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              {isGenerating ? (
                <>
                  <Flame className="w-4 h-4 animate-bounce text-amber-300" />
                  <span>Streaming...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {activeThread.mode === 'compare'
                      ? `Run (${activeThread.selectedModelIds.length})`
                      : 'Send'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
