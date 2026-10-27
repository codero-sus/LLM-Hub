import React, { useState } from 'react';
import { Brain, Check, ChevronDown, ChevronRight, Copy, Sparkles } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  reasoningContent?: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  reasoningContent,
  isStreaming,
}) => {
  const [reasoningExpanded, setReasoningExpanded] = useState(true);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockIndex(idx);
    setTimeout(() => setCopiedBlockIndex(null), 1800);
  };

  // Split content into fenced code blocks vs standard markdown sections
  const segments = content.split(/(```[\s\S]*?```)/g);

  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded bg-slate-800/90 text-indigo-300 border border-slate-700/70"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const renderMarkdownText = (block: string, blockIdx: number) => {
    const lines = block.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];
    let inTable = false;

    const flushTable = (keySuffix: string) => {
      if (tableRows.length === 0) return;
      const header = tableRows[0];
      const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => /^[\s:-]+$/.test(cell)));
      elements.push(
        <div
          key={`tbl-${blockIdx}-${keySuffix}`}
          className="my-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300">
                {header.map((h, i) => (
                  <th key={i} className="py-2 px-3 font-semibold">
                    {renderInlineFormatting(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-slate-300">
                      {renderInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, lIdx) => {
      const trimmed = line.trim();

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(String(lIdx));
      }

      if (!trimmed) {
        elements.push(<div key={`sp-${lIdx}`} className="h-2" />);
        return;
      }

      if (trimmed === '---') {
        elements.push(<hr key={`hr-${lIdx}`} className="my-3 border-slate-800" />);
        return;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3
            key={`h3-${lIdx}`}
            className="text-sm font-bold text-white mt-3 mb-1.5 flex items-center gap-1.5"
          >
            {renderInlineFormatting(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      if (trimmed.startsWith('#### ')) {
        elements.push(
          <h4
            key={`h4-${lIdx}`}
            className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mt-3 mb-1"
          >
            {renderInlineFormatting(trimmed.slice(5))}
          </h4>
        );
        return;
      }

      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`bq-${lIdx}`}
            className="my-2 pl-3 py-1 border-l-2 border-indigo-500/60 bg-indigo-500/5 rounded-r text-xs text-slate-300"
          >
            {renderInlineFormatting(trimmed.slice(2))}
          </blockquote>
        );
        return;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        elements.push(
          <div key={`ul-${lIdx}`} className="flex items-start gap-2 text-sm text-slate-300 my-1 pl-1">
            <span className="text-indigo-400 mt-1.5 text-[10px]">●</span>
            <span className="leading-relaxed">{renderInlineFormatting(trimmed.replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
        return;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
        if (numMatch) {
          elements.push(
            <div key={`ol-${lIdx}`} className="flex items-start gap-2 text-sm text-slate-300 my-1 pl-1">
              <span className="text-indigo-400 font-mono text-xs font-semibold mt-0.5">
                {numMatch[1]}
              </span>
              <span className="leading-relaxed">{renderInlineFormatting(numMatch[2])}</span>
            </div>
          );
          return;
        }
      }

      elements.push(
        <p key={`p-${lIdx}`} className="text-sm text-slate-200 leading-relaxed my-1">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    if (inTable) {
      flushTable('end');
    }

    return elements;
  };

  return (
    <div className="space-y-2">
      {reasoningContent && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setReasoningExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span>Chain-of-Thought Reasoning Trace</span>
              {isStreaming && !content && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-200 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" /> Thinking...
                </span>
              )}
            </span>
            {reasoningExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          {reasoningExpanded && (
            <div className="px-3 pb-2.5 pt-1 border-t border-amber-500/15 font-mono text-[11px] text-amber-100/80 whitespace-pre-wrap leading-relaxed">
              {reasoningContent}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {segments.map((segment, idx) => {
          if (segment.startsWith('```') && segment.endsWith('```')) {
            const firstNewline = segment.indexOf('\n');
            const lang =
              firstNewline > 3 ? segment.slice(3, firstNewline).trim() || 'code' : 'code';
            const codeBody =
              firstNewline > -1
                ? segment.slice(firstNewline + 1, -3).replace(/\n$/, '')
                : segment.slice(3, -3);

            return (
              <div
                key={idx}
                className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950/90 shadow-inner"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span className="uppercase tracking-wider text-indigo-400 font-semibold">
                    {lang}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeBody, idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    {copiedBlockIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                  <code>{codeBody}</code>
                </pre>
              </div>
            );
          }

          return <React.Fragment key={idx}>{renderMarkdownText(segment, idx)}</React.Fragment>;
        })}

        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 align-middle bg-indigo-400 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
};
