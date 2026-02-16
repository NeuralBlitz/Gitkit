
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  content: string;
  onNavigate: (pageId: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onNavigate }) => {
  return (
    <div className="markdown-content prose prose-indigo max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex, 
          [rehypeHighlight, { detect: true, ignoreMissing: true }]
        ]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-6 mt-10 text-slate-900 border-b pb-4 border-slate-100" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mb-4 mt-8 text-slate-800" {...props} />,
          pre: ({node, ...props}) => <pre className="rounded-lg my-6 bg-slate-900 p-4 text-white overflow-x-auto shadow-inner" {...props} />,
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-8 border border-slate-200 rounded-xl shadow-sm">
              <table className="min-w-full divide-y divide-slate-200" {...props} />
            </div>
          ),
          th: ({node, ...props}) => <th className="px-6 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600" {...props} />,
          img: ({node, ...props}) => (
            <div className="my-10 flex flex-col items-center">
              <img className="max-w-full rounded-2xl shadow-xl border border-slate-100" {...props} alt={props.alt || "Wiki illustration"} />
              {props.alt && <span className="mt-3 text-xs text-slate-400 italic font-medium tracking-tight">▲ {props.alt}</span>}
            </div>
          ),
          // Fix: Correctly close the parenthesis and remove the misplaced comma to restore object property syntax
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/40 px-6 py-4 italic text-slate-700 my-8 rounded-r-xl" {...props} />
          ),
          a: ({node, href, ...props}) => {
            const isInternal = href?.startsWith('#') || !href?.startsWith('http');
            if (isInternal && href) {
              const cleanId = href.startsWith('#') ? href.substring(1) : href;
              return (
                <a
                  {...props}
                  href={href}
                  className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors cursor-pointer underline decoration-indigo-200 underline-offset-4"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(cleanId);
                  }}
                />
              );
            }
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors underline decoration-indigo-200 underline-offset-4"
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
