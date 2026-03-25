"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content text-sm text-zinc-900 dark:text-zinc-100 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-400 mb-3">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          hr: () => <hr className="border-zinc-200 dark:border-zinc-700 my-4" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="min-w-full text-sm border-collapse">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold border border-zinc-200 dark:border-zinc-700">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 border border-zinc-200 dark:border-zinc-700">{children}</td>,
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                  {codeString}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}