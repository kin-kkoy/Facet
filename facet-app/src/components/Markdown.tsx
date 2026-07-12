import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Reconstruct the raw text of a (possibly highlight.js-wrapped) code node so we can copy it.
function nodeText(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (typeof node === 'object' && node.props) return nodeText(node.props.children);
  return '';
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="copy-btn" title="Copy code" onClick={() => {
      navigator.clipboard?.writeText(getText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
    }}>
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} /> {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// A code block with a copy button. `children` is the highlighted <code> element.
function Pre({ children }: any) {
  const code = Array.isArray(children) ? children[0] : children;
  return (
    <div className="code-block">
      <CopyButton getText={() => nodeText(code?.props?.children)} />
      <pre>{children}</pre>
    </div>
  );
}

// Themed markdown renderer used by every book (Atlas · Map book · App Specs) and the
// per-module companion. GFM + highlight.js; code blocks get a copy button.
export default memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{ pre: Pre }}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
