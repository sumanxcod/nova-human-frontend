"use client";

import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownRendererProps = {
  content: string;
};

function preprocessMath(content: string): string {
  let out = content ?? "";

  // 1) Display math (process first so inline `$...$` doesn't match inside `$$...$$`)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, math) => {
    try {
      return katex.renderToString(String(math).trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return String(math).trim();
    }
  });

  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, math) => {
    try {
      return katex.renderToString(String(math).trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return String(math).trim();
    }
  });

  // 2) Inline math
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, math) => {
    try {
      return katex.renderToString(String(math).trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return String(math).trim();
    }
  });

  // Match single `$...$` but NOT `$$...$$` (because next char after opener can't be `$`).
  out = out.replace(/\$(?!\$)([\s\S]*?)\$(?!\$)/g, (_m, math) => {
    try {
      return katex.renderToString(String(math).trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return String(math).trim();
    }
  });

  return out;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: legacy clipboard copy.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
      title="Copy code"
      type="button"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = useMemo(() => preprocessMath(content), [content]);

  return (
    <ReactMarkdown
      // KaTeX preprocessing returns HTML strings; rehypeRaw allows it to be rendered.
      rehypePlugins={[rehypeRaw]}
      remarkPlugins={[remarkGfm]}
      skipHtml={false}
      components={{
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children ?? "").replace(/\n$/, "");

          if (!inline && (match || codeString.includes("\n"))) {
            const language = match ? match[1] : "text";
            return (
              <div className="relative group my-3">
                <div className="flex items-center justify-between rounded-t-lg bg-[#1e1e2e] border border-white/10 border-b-0 px-4 py-2">
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                    {language}
                  </span>
                  <CopyButton text={codeString} />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: "0.5rem",
                    borderBottomRightRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderTop: "none",
                    fontSize: "13px",
                    padding: "16px",
                    background: "transparent",
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code
              className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-amber-300"
              {...props}
            >
              {children}
            </code>
          );
        },

        p({ children }) {
          return <p className="mb-3 last:mb-0">{children}</p>;
        },

        strong({ children }) {
          return <strong className="font-semibold text-zinc-50">{children}</strong>;
        },

        em({ children }) {
          return <em className="italic text-zinc-200">{children}</em>;
        },

        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              {children}
            </a>
          );
        },

        ul({ children }) {
          return <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>;
        },

        ol({ children }) {
          return <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>;
        },

        li({ children }) {
          return <li className="text-zinc-200">{children}</li>;
        },

        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-2 border-amber-400/50 pl-4 text-zinc-300 italic">
              {children}
            </blockquote>
          );
        },

        hr() {
          return <hr className="my-4 border-white/10" />;
        },

        h1({ children }) {
          return <h1 className="mb-3 text-lg font-bold text-zinc-50">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-2 text-base font-bold text-zinc-50">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-2 text-sm font-bold text-zinc-100">{children}</h3>;
        },

        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-white/5 text-zinc-300">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-2 text-left font-medium">{children}</th>;
        },
        td({ children }) {
          return <td className="border-t border-white/5 px-3 py-2 text-zinc-200">{children}</td>;
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

