/**
 * Lightweight markdown renderer for AI-generated responses.
 * Supports: # H1/H2/H3 headers, **bold**, *italic*, `code`,
 * numbered lists, bullet lists, horizontal rules, and paragraphs.
 */

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={idx} className="bg-stone-100 rounded px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="font-bold text-stone-800 text-xs uppercase tracking-widest mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="font-bold text-stone-900 text-sm mt-5 mb-2 border-b border-stone-200 pb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="font-bold text-stone-900 text-base mt-5 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Numbered list block
    if (/^\d+[\.\)]\s/.test(line)) {
      const items = [];
      const listKey = key++;
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i])) {
        items.push(
          <li key={i} className="leading-relaxed pl-1">
            {renderInline(lines[i].replace(/^\d+[\.\)]\s/, ''))}
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={listKey} className="list-decimal list-outside ml-5 space-y-1 my-2">
          {items}
        </ol>
      );
      continue;
    }

    // Bullet list block
    if (/^[-*•]\s/.test(line)) {
      const items = [];
      const listKey = key++;
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(
          <li key={i} className="leading-relaxed pl-1">
            {renderInline(lines[i].replace(/^[-*•]\s/, ''))}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={listKey} className="list-disc list-outside ml-5 space-y-1 my-2">
          {items}
        </ul>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-stone-200 my-3" />);
      i++;
      continue;
    }

    // Empty line — skip (spacing handled by space-y on parent)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="leading-relaxed text-stone-700">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className={`text-sm space-y-1 ${className}`}>
      {elements}
    </div>
  );
}
