export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'meta'
  | 'mistral'
  | 'qwen';

export type CapabilityTag =
  | 'Reasoning'
  | 'Vision'
  | 'Coding'
  | 'Tool Use'
  | 'JSON Mode'
  | 'Long Context'
  | 'Fast';

export interface ModelBenchmarks {
  arenaElo: number;
  mmluPro: number;       // %
  coding: number;        // HumanEval / SWE-Bench composite %
  gpqaDiamond: number;   // %
  math500: number;       // %
  sweBench: number;      // %
}

export interface ModelPricing {
  inputPerMillion: number;       // USD per 1M input tokens
  outputPerMillion: number;      // USD per 1M output tokens
  cachedInputPerMillion?: number;
}

export interface LLMModel {
  id: string;
  apiModelId: string;
  name: string;
  provider: ProviderId;
  providerName: string;
  releaseDate: string;
  license: 'Proprietary' | 'Open Weights (MIT)' | 'Open Weights (Apache 2.0)' | 'Open Weights (Llama)';
  parameters: string;
  contextWindow: number;         // in tokens
  maxOutputTokens: number;
  pricing: ModelPricing;
  speedTokensPerSec: number;
  ttftSeconds: number;           // Time to first token
  benchmarks: ModelBenchmarks;
  capabilities: CapabilityTag[];
  isReasoning: boolean;
  description: string;
  strengths: string[];
  accentColor: string;
}

export interface ModelParameters {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  reasoningEffort: 'low' | 'medium' | 'high';
}

export interface ModelResponseMetrics {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  latencyMs: number;
  ttftMs: number;
  tokensPerSec: number;
  estimatedCostUsd: number;
  mode: 'live-api' | 'demo-stream';
}

export interface ModelCompletionItem {
  modelId: string;
  content: string;
  reasoningContent?: string;
  isStreaming: boolean;
  error?: string;
  metrics?: ModelResponseMetrics;
}

export interface ChatTurn {
  id: string;
  timestamp: string;
  userPrompt: string;
  responses: Record<string, ModelCompletionItem>; // keyed by modelId
  arenaBattle?: {
    modelA: string;
    modelB: string;
    revealed: boolean;
    winner?: 'A' | 'B' | 'tie' | 'both_bad';
  };
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: 'single' | 'compare' | 'arena';
  selectedModelIds: string[];
  parameters: ModelParameters;
  turns: ChatTurn[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  category:
    | 'Coding & Architecture'
    | 'Reasoning & Math'
    | 'Data Extraction'
    | 'Code Review & Security'
    | 'System Prompts'
    | 'Writing & Strategy'
    | 'Agent Workflows';
  description: string;
  systemPrompt: string;
  template: string;
  defaultVariables: Record<string, string>;
  recommendedModels: string[];
  isFavorite?: boolean;
  isCustom?: boolean;
}

export interface ProviderConfig {
  providerId: ProviderId | 'openrouter' | 'groq' | 'ollama';
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  status: 'unconfigured' | 'ready' | 'error';
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  provider: ProviderId;
  promptPreview: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  tokensPerSec: number;
  mode: 'live-api' | 'demo-stream';
  status: 'success' | 'error';
}
