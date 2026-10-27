import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Columns,
  Copy,
  FileCode2,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react';
import { LLMModel, PromptTemplate } from '../types/llm';
import { estimateTokenCount } from '../services/llmEngine';

interface PromptLibraryViewProps {
  templates: PromptTemplate[];
  models: LLMModel[];
  onUpdateTemplates: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  onRunPromptInPlayground: (options: {
    compiledPrompt: string;
    systemPrompt: string;
    modelIds: string[];
    mode: 'single' | 'compare';
  }) => void;
}

export const PromptLibraryView: React.FC<PromptLibraryViewProps> = ({
  templates,
  models,
  onUpdateTemplates,
  onRunPromptInPlayground,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    templates[0]?.defaultVariables || {}
  );
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // New template creator state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] =
    useState<PromptTemplate['category']>('Coding & Architecture');
  const [newDesc, setNewDesc] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState(
    'You are a Staff AI Systems Engineer. Provide rigorous, production-safe code and architecture.'
  );
  const [newBody, setNewBody] = useState(
    'Design a {{component}} in {{language}} optimized for {{constraint}}.'
  );

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const handleSelectTemplate = (tpl: PromptTemplate) => {
    setActiveTemplateId(tpl.id);
    setVariableValues({ ...tpl.defaultVariables });
  };

  // Extract all {{variable_name}} placeholders dynamically
  const detectedVariables = useMemo(() => {
    if (!activeTemplate) return [];
    const matches = activeTemplate.template.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    const unique = Array.from(
      new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))
    );
    return unique;
  }, [activeTemplate]);

  // Compile prompt by substituting {{var}} with current variableValues
  const compiledPrompt = useMemo(() => {
    if (!activeTemplate) return '';
    let result = activeTemplate.template;
    detectedVariables.forEach((v) => {
      const val = variableValues[v] ?? activeTemplate.defaultVariables[v] ?? `[${v}]`;
      result = result.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, 'g'), val);
    });
    return result;
  }, [activeTemplate, detectedVariables, variableValues]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedCategory === 'Favorites' && !t.isFavorite) return false;
      if (
        selectedCategory !== 'All' &&
        selectedCategory !== 'Favorites' &&
        t.category !== selectedCategory
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  const toggleFavorite = (id: string) => {
    onUpdateTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) return;
    const next = templates.filter((t) => t.id !== id);
    onUpdateTemplates(next);
    if (activeTemplateId === id && next[0]) {
      handleSelectTemplate(next[0]);
    }
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    const vars = Array.from(
      new Set(
        (newBody.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []).map((m) =>
          m.replace(/\{\{|\}\}/g, '').trim()
        )
      )
    );
    const defaultVars: Record<string, string> = {};
    vars.forEach((v) => {
      defaultVars[v] = `Sample ${v}`;
    });

    const created: PromptTemplate = {
      id: `tpl-custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Custom parameterized prompt template.',
      systemPrompt: newSystemPrompt.trim(),
      template: newBody,
      defaultVariables: defaultVars,
      recommendedModels: ['claude-3-7-sonnet', 'gpt-4o', 'deepseek-r1'],
      isFavorite: true,
      isCustom: true,
    };

    onUpdateTemplates((prev) => [created, ...prev]);
    handleSelectTemplate(created);
    setShowNewModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const categories = [
    'All',
    'Favorites',
    'Coding & Architecture',
    'Reasoning & Math',
    'Code Review & Security',
    'Data Extraction',
    'Agent Workflows',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-2">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Parameterized Prompt Engineering Studio</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Prompt Library & Variable Compiler
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Interpolate dynamic <code className="text-indigo-300">{'{{variables}}'}</code>, preview
            token budgets, and broadcast directly to single or multi-model comparisons.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Prompt Template</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter prompt templates..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Split Studio: Left Template List + Right Variable Compiler */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredTemplates.map((tpl) => {
            const isSelected = tpl.id === activeTemplate?.id;
            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 mb-1.5">
                      {tpl.category}
                    </span>
                    <h3 className="text-sm font-bold text-white">{tpl.title}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(tpl.id);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          tpl.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                    {tpl.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id);
                        }}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tpl.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/70">
                  <span className="text-[10px] text-slate-500">Recommended:</span>
                  {tpl.recommendedModels.map((mId) => {
                    const m = models.find((x) => x.id === mId);
                    return (
                      <span
                        key={mId}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                      >
                        {m?.name || mId}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Active Template Variable Studio & Compiled Preview */}
        {activeTemplate && (
          <div className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeTemplate.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeTemplate.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onRunPromptInPlayground({
                      compiledPrompt,
                      systemPrompt: activeTemplate.systemPrompt,
                      modelIds: [activeTemplate.recommendedModels[0] || 'claude-3-7-sonnet'],
                      mode: 'single',
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Run Single</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRunPromptInPlayground({
                      compiledPrompt,
                      systemPrompt: activeTemplate.systemPrompt,
                      modelIds:
                        activeTemplate.recommendedModels.length >= 2
                          ? activeTemplate.recommendedModels
                          : ['claude-3-7-sonnet', 'deepseek-r1', 'gemini-2.5-pro'],
                      mode: 'compare',
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Run in 3-Model Compare</span>
                </button>
              </div>
            </div>

            {/* Dynamic Variable Inputs */}
            {detectedVariables.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Template Variables ({detectedVariables.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detectedVariables.map((varName) => (
                    <div key={varName} className="space-y-1">
                      <label className="block text-[11px] font-mono text-slate-300">
                        {`{{${varName}}}`}
                      </label>
                      <textarea
                        rows={2}
                        value={
                          variableValues[varName] ?? activeTemplate.defaultVariables[varName] ?? ''
                        }
                        onChange={(e) =>
                          setVariableValues((prev) => ({
                            ...prev,
                            [varName]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Prompt Preview */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                System Prompt Persona
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 font-mono">
                {activeTemplate.systemPrompt}
              </div>
            </div>

            {/* Live Compiled Prompt Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Compiled Prompt Output ({estimateTokenCount(compiledPrompt)} Est. Tokens)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(compiledPrompt);
                    setCopiedPreview(true);
                    setTimeout(() => setCopiedPreview(false), 1800);
                  }}
                  className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
                >
                  {copiedPreview ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {compiledPrompt}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Creating Custom Prompt Template */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Parameterized Prompt Template</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Template Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Kubernetes Incident Triage"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as PromptTemplate['category'])
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="Coding & Architecture">Coding & Architecture</option>
                    <option value="Reasoning & Math">Reasoning & Math</option>
                    <option value="Code Review & Security">Code Review & Security</option>
                    <option value="Data Extraction">Data Extraction</option>
                    <option value="Agent Workflows">Agent Workflows</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Short Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe what this prompt accomplishes..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">System Prompt</label>
                <input
                  type="text"
                  value={newSystemPrompt}
                  onChange={(e) => setNewSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Prompt Template (Use {'{{variable_name}}'} for dynamic fields)
                </label>
                <textarea
                  rows={5}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
