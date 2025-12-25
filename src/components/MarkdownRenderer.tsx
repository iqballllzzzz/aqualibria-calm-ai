import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languageLabels: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    cs: "C#",
    csharp: "C#",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    xml: "XML",
    sql: "SQL",
    bash: "Bash",
    sh: "Shell",
    go: "Go",
    rust: "Rust",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    dart: "Dart",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    markdown: "Markdown",
  };

  const displayLanguage = languageLabels[language.toLowerCase()] || language.toUpperCase() || "Code";

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border bg-background-elevated">
      <div className="flex items-center justify-between px-4 py-2 bg-accent/50 border-b border-border">
        <span className="text-xs font-medium text-foreground-muted">{displayLanguage}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-foreground-muted hover:text-foreground hover:bg-accent transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-foreground whitespace-pre">{code}</code>
      </pre>
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const parseContent = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const lines = text.split("\n");
    let i = 0;
    let keyIndex = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      const codeBlockMatch = line.match(/^```(\w*)/);
      if (codeBlockMatch) {
        const language = codeBlockMatch[1] || "text";
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(<CodeBlock key={keyIndex++} code={codeLines.join("\n")} language={language} />);
        i++;
        continue;
      }

      // Table detection
      if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
        const tableRows: string[][] = [];
        while (i < lines.length && lines[i].includes("|")) {
          const cells = lines[i]
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell && !cell.match(/^-+$/));
          if (cells.length > 0 && !lines[i].match(/^\|?[\s-|]+\|?$/)) {
            tableRows.push(cells);
          }
          i++;
        }
        if (tableRows.length > 0) {
          elements.push(
            <div key={keyIndex++} className="my-4 overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-accent/50">
                    {tableRows[0].map((cell, cellIndex) => (
                      <th key={cellIndex} className="px-4 py-2 text-left text-sm font-medium text-foreground border border-border">
                        {parseInlineContent(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-accent/20">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-sm text-foreground border border-border">
                          {parseInlineContent(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Headers
      if (line.startsWith("### ")) {
        elements.push(<h3 key={keyIndex++} className="text-lg font-semibold text-foreground mt-4 mb-2">{parseInlineContent(line.slice(4))}</h3>);
        i++;
        continue;
      }
      if (line.startsWith("## ")) {
        elements.push(<h2 key={keyIndex++} className="text-xl font-semibold text-foreground mt-5 mb-2">{parseInlineContent(line.slice(3))}</h2>);
        i++;
        continue;
      }
      if (line.startsWith("# ")) {
        elements.push(<h1 key={keyIndex++} className="text-2xl font-bold text-foreground mt-6 mb-3">{parseInlineContent(line.slice(2))}</h1>);
        i++;
        continue;
      }

      // Ordered list
      if (line.match(/^\d+\.\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
          listItems.push(lines[i].replace(/^\d+\.\s/, ""));
          i++;
        }
        elements.push(
          <ol key={keyIndex++} className="list-decimal list-inside my-3 space-y-1.5 text-foreground">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-relaxed">{parseInlineContent(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Unordered list
      if (line.match(/^[-*]\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].match(/^[-*]\s/)) {
          listItems.push(lines[i].replace(/^[-*]\s/, ""));
          i++;
        }
        elements.push(
          <ul key={keyIndex++} className="list-disc list-inside my-3 space-y-1.5 text-foreground">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-relaxed">{parseInlineContent(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Blockquote
      if (line.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith("> ")) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        elements.push(
          <blockquote key={keyIndex++} className="border-l-4 border-foreground/30 pl-4 my-4 italic text-foreground-muted">
            {quoteLines.map((qLine, qIndex) => (
              <p key={qIndex}>{parseInlineContent(qLine)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        elements.push(<hr key={keyIndex++} className="my-4 border-border" />);
        i++;
        continue;
      }

      // Empty line
      if (line.trim() === "") {
        elements.push(<div key={keyIndex++} className="h-2" />);
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(<p key={keyIndex++} className="my-2 leading-relaxed text-foreground">{parseInlineContent(line)}</p>);
      i++;
    }

    return elements;
  };

  const parseInlineContent = (text: string): React.ReactNode => {
    // Handle inline code, bold, italic
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0) {
          parts.push(parseFormattedText(remaining.slice(0, codeMatch.index), keyIndex++));
        }
        parts.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-accent text-foreground text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
        continue;
      }

      // No more inline code, parse rest for bold/italic
      parts.push(parseFormattedText(remaining, keyIndex++));
      break;
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  const parseFormattedText = (text: string, keyStart: number): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = keyStart;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Italic *text*
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

      const boldIndex = boldMatch?.index ?? Infinity;
      const italicIndex = italicMatch?.index ?? Infinity;

      if (boldIndex === Infinity && italicIndex === Infinity) {
        parts.push(remaining);
        break;
      }

      if (boldIndex <= italicIndex && boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(<strong key={keyIndex++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(remaining.slice(0, italicMatch.index));
        }
        parts.push(<em key={keyIndex++} className="italic">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      }
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  return <div className={`markdown-content ${className}`}>{parseContent(content)}</div>;
};

export default MarkdownRenderer;