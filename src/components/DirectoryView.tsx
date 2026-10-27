import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Award,
  BarChart3,
  Calculator,
  Check,
  Code2,
  Cpu,
  DollarSign,
  ExternalLink,
  Filter,
  Gauge,
  Layers,
  Lock,
  Play,
  Plus,
  Scale,
  Search,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react';
import { CapabilityTag, LLMModel, ProviderId } from '../types/llm';
import { PROVIDER_META } from '../data/models';
import { estimateTokenCount } from '../services/llmEngine';

interface DirectoryViewProps {
  models: LLMModel[];
  arenaScores: Record<string, { wins: number; ties: number; battles: number; eloDelta: number }>;
  onOpenInPlayground: (modelIds: string[], mode: 'single' | 'compare') => void;
}

type SortKey =
  | 'arenaElo'
  | 'sweBench'
  | 'coding'
  | 'math500'
  | 'mmluPro'
  | 'speed'
  | 'inputCost'
  | 'contextWindow';

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  models,
  arenaScores,
  onOpenInPlayground,
}) => {
  const [subTab, setSubTab] = useState<'leaderboard' | 'compare' | 'calculator'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | 'all'>('all');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'open' | 'proprietary'>('all');
  const [selectedCapability, setSelectedCapability] = useState<CapabilityTag | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('arenaElo');

  // Models pinned for side-by-side comparison (2 to 4)
  const [comparedIds, setComparedIds] = useState<string[]>([
    'claude-3-7-sonnet',
    'gemini-2.5-pro',
    'deepseek-r1',
    'o3-mini',
  ]);

  // Interactive Token & Cost Calculator State
  const [requestsPerDay, setRequestsPerDay] = useState<number>(2500);
  const [avgInputTokens, setAvgInputTokens] = useState<number>(1800);
  const [avgOutputTokens, setAvgOutputTokens] = useState<number>(650);
  const [cacheHitRatio, setCacheHitRatio] = useState<number>(30); // %
  const [sampleText, setSampleText] = useState<string>(
    'Paste any prompt, system instruction, or JSON payload here to measure its exact token count and apply it to the cost projection...'
  );

  const toggleCompareModel = (id: string) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const filteredModels = useMemo(() => {
    return models
      .filter((m) => {
        if (selectedProvider !== 'all' && m.provider !== selectedProvider) return false;
        if (licenseFilter === 'open' && m.license === 'Proprietary') return false;
        if (licenseFilter === 'proprietary' && m.license !== 'Proprietary') return false;
        if (selectedCapability !== 'all' && !m.capabilities.includes(selectedCapability))
          return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.providerName.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.capabilities.some((c) => c.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const eloA = a.benchmarks.arenaElo + (arenaScores[a.id]?.eloDelta || 0);
        const eloB = b.benchmarks.arenaElo + (arenaScores[b.id]?.eloDelta || 0);
        switch (sortBy) {
          case 'arenaElo':
            return eloB - eloA;
          case 'sweBench':
            return b.benchmarks.sweBench - a.benchmarks.sweBench;
          case 'coding':
            return b.benchmarks.coding - a.benchmarks.coding;
          case 'math500':
            return b.benchmarks.math500 - a.benchmarks.math500;
          case 'mmluPro':
            return b.benchmarks.mmluPro - a.benchmarks.mmluPro;
          case 'speed':
            return b.speedTokensPerSec - a.speedTokensPerSec;
          case 'inputCost':
            return a.pricing.inputPerMillion - b.pricing.inputPerMillion;
          case 'contextWindow':
            return b.contextWindow - a.contextWindow;
          default:
            return eloB - eloA;
        }
      });
  }, [models, selectedProvider, licenseFilter, selectedCapability, searchQuery, sortBy, arenaScores]);

  const comparedModels = useMemo(
    () => comparedIds.map((id) => models.find((m) => m.id === id)).filter(Boolean) as LLMModel[],
    [comparedIds, models]
  );

  const sampleTokenCount = useMemo(() => estimateTokenCount(sampleText), [sampleText]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Frontier & Open-Weights Intelligence Index</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            LLM Directory, Leaderboard & Cost Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare {models.length} frontier models across SWE-bench, GPQA Diamond, MATH-500, Arena
            ELO, token throughput, and live pricing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                subTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Leaderboard ({models.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('compare')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                subTab === 'compare'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Head-to-Head ({comparedIds.length}/4)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('calculator')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                subTab === 'calculator'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Token & Cost Calculator</span>
            </button>
          </div>

          {comparedIds.length >= 2 && (
            <button
              type="button"
              onClick={() => onOpenInPlayground(comparedIds, 'compare')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Launch {comparedIds.length} in Playground</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: LEADERBOARD & DIRECTORY */}
      {subTab === 'leaderboard' && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/50 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search model name, provider, capability..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as ProviderId | 'all')}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Providers</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google DeepMind</option>
                <option value="deepseek">DeepSeek</option>
                <option value="meta">Meta AI</option>
                <option value="qwen">Alibaba Qwen</option>
                <option value="mistral">Mistral AI</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={licenseFilter}
                onChange={(e) =>
                  setLicenseFilter(e.target.value as 'all' | 'open' | 'proprietary')
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Licenses</option>
                <option value="open">Open Weights Only</option>
                <option value="proprietary">Proprietary Only</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedCapability}
                onChange={(e) => setSelectedCapability(e.target.value as CapabilityTag | 'all')}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Capabilities</option>
                <option value="Reasoning">Reasoning / CoT</option>
                <option value="Coding">Coding Specialist</option>
                <option value="Vision">Vision / Multimodal</option>
                <option value="Tool Use">Tool Calling</option>
                <option value="Long Context">Long Context</option>
                <option value="Fast">Ultra-Fast (&gt;100 tok/s)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-indigo-500/40 text-xs font-medium text-indigo-200 focus:outline-none"
              >
                <option value="arenaElo">Sort: Arena ELO</option>
                <option value="sweBench">Sort: SWE-bench Verified</option>
                <option value="coding">Sort: Coding Score</option>
                <option value="math500">Sort: MATH-500</option>
                <option value="mmluPro">Sort: MMLU-Pro</option>
                <option value="speed">Sort: Speed (tok/s)</option>
                <option value="inputCost">Sort: Lowest Price</option>
                <option value="contextWindow">Sort: Context Window</option>
              </select>
            </div>
          </div>

          {/* Interactive Benchmark Leaderboard Table */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Rank & Model</th>
                    <th className="py-3 px-3">License & Arch</th>
                    <th className="py-3 px-3 text-right">Arena ELO</th>
                    <th className="py-3 px-3 text-right">SWE-bench</th>
                    <th className="py-3 px-3 text-right">MATH-500</th>
                    <th className="py-3 px-3 text-right">MMLU-Pro</th>
                    <th className="py-3 px-3 text-right">Context</th>
                    <th className="py-3 px-3 text-right">Speed</th>
                    <th className="py-3 px-3 text-right">Price ($/1M)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredModels.map((model, idx) => {
                    const pMeta = PROVIDER_META[model.provider];
                    const isPinned = comparedIds.includes(model.id);
                    const isOpenWeights = model.license !== 'Proprietary';
                    const dynamicElo =
                      model.benchmarks.arenaElo + (arenaScores[model.id]?.eloDelta || 0);

                    return (
                      <tr
                        key={model.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isPinned ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                                idx === 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : idx === 1
                                  ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                                  : idx === 2
                                  ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{model.name}</span>
                                {model.isReasoning && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Reasoning
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded ${pMeta.badgeBg} ${pMeta.badgeText}`}
                                >
                                  {model.providerName}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {model.strengths[0]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isOpenWeights ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium">
                                <Unlock className="w-2.5 h-2.5" />
                                {model.license.replace('Open Weights ', '')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                Proprietary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
                            {model.parameters}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-300">
                          {dynamicElo}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">
                          <span className="text-slate-200 font-semibold">
                            {model.benchmarks.sweBench}%
                          </span>
                          <div className="w-16 ml-auto h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, model.benchmarks.sweBench * 1.25)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">
                          <span className="text-slate-200 font-semibold">
                            {model.benchmarks.math500}%
                          </span>
                          <div className="w-16 ml-auto h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${model.benchmarks.math500}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                          {model.benchmarks.mmluPro}%
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                          {model.contextWindow >= 1_000_000
                            ? `${model.contextWindow / 1_000_000}M`
                            : `${Math.round(model.contextWindow / 1000)}K`}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                          {model.speedTokensPerSec} tok/s
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className="text-slate-200">
                            ${model.pricing.inputPerMillion.toFixed(2)}{' '}
                            <span className="text-slate-500">in</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ${model.pricing.outputPerMillion.toFixed(2)}{' '}
                            <span className="text-slate-500">out</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleCompareModel(model.id)}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1 ${
                                isPinned
                                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                              title="Pin/Unpin for Head-to-Head Comparison"
                            >
                              {isPinned ? (
                                <>
                                  <Check className="w-3 h-3 text-indigo-400" />
                                  <span>Pinned</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Compare</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenInPlayground([model.id], 'single')}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                            >
                              Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEAD-TO-HEAD MODEL COMPARATOR */}
      {subTab === 'compare' && (
        <div className="space-y-6">
          {/* Model Picker Pills */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center justify-between">
              <span>Select up to 4 Models for Deep Side-by-Side Specification Comparison:</span>
              <span className="text-indigo-300 font-mono">{comparedIds.length} / 4 Selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => {
                const active = comparedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleCompareModel(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-indigo-600/25 border-indigo-500 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparedModels.map((m) => {
              const pMeta = PROVIDER_META[m.provider];
              // Compute a composite Efficiency Score (Arena ELO vs blended price)
              const blendedPrice = (m.pricing.inputPerMillion * 3 + m.pricing.outputPerMillion) / 4;
              const valueIndex = Math.min(
                99,
                Math.round((m.benchmarks.arenaElo - 1250) / Math.pow(blendedPrice + 0.3, 0.32))
              );

              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-4 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded border mb-1.5 ${pMeta.badgeBg} ${pMeta.badgeText} ${pMeta.border}`}
                        >
                          {m.providerName}
                        </span>
                        <h3 className="text-base font-bold text-white">{m.name}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {m.parameters} • {m.license}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>

                    {/* Benchmark Bars */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      {[
                        {
                          label: 'Arena ELO',
                          val: m.benchmarks.arenaElo,
                          pct: ((m.benchmarks.arenaElo - 1250) / 150) * 100,
                          suffix: '',
                          color: 'bg-indigo-500',
                        },
                        {
                          label: 'SWE-bench Verified',
                          val: m.benchmarks.sweBench,
                          pct: m.benchmarks.sweBench,
                          suffix: '%',
                          color: 'bg-amber-500',
                        },
                        {
                          label: 'Coding (HumanEval+)',
                          val: m.benchmarks.coding,
                          pct: m.benchmarks.coding,
                          suffix: '%',
                          color: 'bg-emerald-500',
                        },
                        {
                          label: 'MATH-500',
                          val: m.benchmarks.math500,
                          pct: m.benchmarks.math500,
                          suffix: '%',
                          color: 'bg-cyan-500',
                        },
                        {
                          label: 'GPQA Diamond (PhD)',
                          val: m.benchmarks.gpqaDiamond,
                          pct: m.benchmarks.gpqaDiamond,
                          suffix: '%',
                          color: 'bg-violet-500',
                        },
                        {
                          label: 'MMLU-Pro',
                          val: m.benchmarks.mmluPro,
                          pct: m.benchmarks.mmluPro,
                          suffix: '%',
                          color: 'bg-blue-500',
                        },
                      ].map((metric) => (
                        <div key={metric.label}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">{metric.label}</span>
                            <span className="font-mono font-semibold text-slate-200">
                              {metric.val}
                              {metric.suffix}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${metric.color} rounded-full`}
                              style={{ width: `${Math.min(100, Math.max(10, metric.pct))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                        <div className="text-[10px] text-slate-400">Input / 1M</div>
                        <div className="font-mono font-bold text-white">
                          ${m.pricing.inputPerMillion.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                        <div className="text-[10px] text-slate-400">Output / 1M</div>
                        <div className="font-mono font-bold text-white">
                          ${m.pricing.outputPerMillion.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                        <div className="text-[10px] text-slate-400">Throughput</div>
                        <div className="font-mono font-bold text-emerald-400">
                          {m.speedTokensPerSec} tok/s
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                        <div className="text-[10px] text-slate-400">Context Window</div>
                        <div className="font-mono font-bold text-indigo-300">
                          {m.contextWindow >= 1_000_000
                            ? `${m.contextWindow / 1_000_000}M`
                            : `${m.contextWindow / 1000}K`}
                        </div>
                      </div>
                    </div>

                    {/* Capability Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenInPlayground([m.id], 'single')}
                    className="w-full py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-semibold transition-all"
                  >
                    Open {m.name} in Playground
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE TOKEN & COST CALCULATOR */}
      {subTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Workload Sliders & Live Token Estimator */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span>Workload & Traffic Parameters</span>
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Daily API Requests</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {requestsPerDay.toLocaleString()} req/day
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={100000}
                  step={100}
                  value={requestsPerDay}
                  onChange={(e) => setRequestsPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Avg. Input Prompt Tokens / Req</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {avgInputTokens.toLocaleString()} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={32000}
                  step={100}
                  value={avgInputTokens}
                  onChange={(e) => setAvgInputTokens(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Avg. Completion Output Tokens / Req</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {avgOutputTokens.toLocaleString()} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={8000}
                  step={50}
                  value={avgOutputTokens}
                  onChange={(e) => setAvgOutputTokens(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Prompt Cache Hit Rate</span>
                  <span className="font-mono font-bold text-emerald-400">{cacheHitRatio}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={cacheHitRatio}
                  onChange={(e) => setCacheHitRatio(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Monthly Input Volume</div>
                  <div className="font-mono font-bold text-white">
                    {(((requestsPerDay * avgInputTokens * 30) / 1_000_000).toFixed(1))}M tokens
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Monthly Output Volume</div>
                  <div className="font-mono font-bold text-white">
                    {(((requestsPerDay * avgOutputTokens * 30) / 1_000_000).toFixed(1))}M tokens
                  </div>
                </div>
              </div>
            </div>

            {/* Live Prompt Tokenizer Box */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Live Prompt Tokenizer</h3>
                <button
                  type="button"
                  onClick={() => setAvgInputTokens(sampleTokenCount)}
                  className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium"
                >
                  Apply ({sampleTokenCount} tok) to Calculator
                </button>
              </div>
              <textarea
                rows={4}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Characters: {sampleText.length}</span>
                <span className="text-indigo-300 font-bold">
                  Estimated Tokens: {sampleTokenCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Ranked Monthly Cost Projection Table */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Monthly & Daily Spend Projection Across All Models (Ranked Cheapest First)
              </h3>
              <span className="text-xs text-slate-400 font-mono">30-Day Billing Cycle</span>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {models
                .map((m) => {
                  const dailyInputM = (requestsPerDay * avgInputTokens) / 1_000_000;
                  const dailyOutputM = (requestsPerDay * avgOutputTokens) / 1_000_000;
                  const cacheRate = cacheHitRatio / 100;
                  const cachedPrice =
                    m.pricing.cachedInputPerMillion ?? m.pricing.inputPerMillion * 0.5;

                  const effectiveInputPrice =
                    m.pricing.inputPerMillion * (1 - cacheRate) + cachedPrice * cacheRate;
                  const dailyCost =
                    dailyInputM * effectiveInputPrice + dailyOutputM * m.pricing.outputPerMillion;
                  const monthlyCost = dailyCost * 30;
                  const estResponseSec =
                    m.ttftSeconds + avgOutputTokens / Math.max(1, m.speedTokensPerSec);

                  return { model: m, dailyCost, monthlyCost, estResponseSec };
                })
                .sort((a, b) => a.monthlyCost - b.monthlyCost)
                .map((item, idx) => {
                  const pMeta = PROVIDER_META[item.model.provider];
                  return (
                    <div
                      key={item.model.id}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-xs font-mono text-slate-500">#{idx + 1}</span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{item.model.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded ${pMeta.badgeBg} ${pMeta.badgeText}`}
                            >
                              {item.model.providerName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            ELO {item.model.benchmarks.arenaElo} • Est. Latency:{' '}
                            {item.estResponseSec.toFixed(1)}s / req
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400">Daily</div>
                          <div className="text-xs text-slate-200">${item.dailyCost.toFixed(2)}</div>
                        </div>
                        <div className="min-w-[92px]">
                          <div className="text-[10px] text-slate-400">Monthly (30d)</div>
                          <div className="text-sm font-bold text-emerald-400">
                            ${item.monthlyCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
