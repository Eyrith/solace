'use client'

import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
  onHighlightSelect?: (selectedText: string, startOffset: number, endOffset: number) => void
}

export function MarkdownRenderer({ content, className = '', onHighlightSelect }: MarkdownRendererProps) {
  // Handle mouseup for text selection / marginalia thoughts
  const handleMouseUp = () => {
    if (!onHighlightSelect) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const text = selection.toString().trim()
    if (text.length > 5) {
      onHighlightSelect(text, 0, text.length)
    }
  }

  const renderBlocks = (text: string) => {
    if (!text) return null
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeLanguage = ''
    let codeLines: string[] = []
    let inList = false
    let listType: 'ul' | 'ol' = 'ul'
    let listItems: string[] = []
    let inTable = false
    let tableRows: string[][] = []

    const flushList = () => {
      if (!inList) return
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-4 ml-6 space-y-2 list-disc text-foreground/90">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        )
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-4 ml-6 space-y-2 list-decimal text-foreground/90">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        )
      }
      inList = false
      listItems = []
    }

    const flushTable = () => {
      if (!inTable || tableRows.length === 0) return
      const [header, ...body] = tableRows
      elements.push(
        <div key={`table-${elements.length}`} className="my-6 overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/40">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="px-4 py-3 font-serif font-medium text-foreground">
                    {renderInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-foreground/80">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      inTable = false
      tableRows = []
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushList()
          flushTable()
          inCodeBlock = true
          codeLanguage = line.slice(3).trim()
          codeLines = []
        } else {
          inCodeBlock = false
          elements.push(
            <div key={`code-${elements.length}`} className="my-6 rounded-lg border border-border/40 bg-muted/30 overflow-hidden font-mono text-xs">
              {codeLanguage && (
                <div className="px-4 py-1.5 border-b border-border/30 bg-muted/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                  {codeLanguage}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-foreground/90 leading-relaxed font-mono">
                <code>{codeLines.join('\n')}</code>
              </pre>
            </div>
          )
        }
        continue
      }

      if (inCodeBlock) {
        codeLines.push(line)
        continue
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList()
        // Check if separator line
        if (/^\|[-:\s|]+\|$/.test(line.trim())) {
          continue
        }
        inTable = true
        const cells = line.trim().slice(1, -1).split('|')
        tableRows.push(cells)
        continue
      } else if (inTable) {
        flushTable()
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote
            key={`quote-${elements.length}`}
            className="my-6 pl-4 border-l-2 border-primary/50 italic text-foreground/85 font-serif text-lg leading-relaxed"
          >
            {renderInline(line.slice(2))}
          </blockquote>
        )
        continue
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        flushList()
        elements.push(<hr key={`hr-${elements.length}`} className="my-8 border-border/40" />)
        continue
      }

      // Headings
      if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={`h1-${elements.length}`} className="font-serif text-3xl font-semibold tracking-tight text-foreground mt-10 mb-4 first:mt-0">
            {renderInline(line.slice(2))}
          </h1>
        )
        continue
      }
      if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={`h2-${elements.length}`} className="font-serif text-2xl font-medium tracking-tight text-foreground mt-8 mb-3">
            {renderInline(line.slice(3))}
          </h2>
        )
        continue
      }
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={`h3-${elements.length}`} className="font-serif text-xl font-medium text-foreground mt-6 mb-2">
            {renderInline(line.slice(4))}
          </h3>
        )
        continue
      }
      if (line.startsWith('#### ')) {
        flushList()
        elements.push(
          <h4 key={`h4-${elements.length}`} className="font-serif text-lg font-medium text-foreground mt-4 mb-2">
            {renderInline(line.slice(5))}
          </h4>
        )
        continue
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        if (!inList || listType !== 'ul') {
          flushList()
          inList = true
          listType = 'ul'
        }
        listItems.push(line.trim().slice(2))
        continue
      }
      const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/)
      if (orderedMatch) {
        if (!inList || listType !== 'ol') {
          flushList()
          inList = true
          listType = 'ol'
        }
        listItems.push(orderedMatch[2])
        continue
      }

      // Math block
      if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
        flushList()
        const mathContent = line.slice(2, -2).trim()
        elements.push(
          <div key={`math-${elements.length}`} className="my-6 p-4 rounded-md bg-muted/20 border border-border/20 text-center font-serif text-lg tracking-wide text-primary/90">
            {mathContent}
          </div>
        )
        continue
      }

      // Empty line
      if (!line.trim()) {
        flushList()
        continue
      }

      // Paragraph
      flushList()
      elements.push(
        <p key={`p-${elements.length}`} className="my-4 leading-relaxed text-foreground/90 font-serif text-lg">
          {renderInline(line)}
        </p>
      )
    }

    flushList()
    flushTable()
    return elements
  }

  // Render inline formatting (bold, italic, code, links, math, highlights)
  const renderInline = (text: string): React.ReactNode => {
    // Regex tokenizer for inline patterns
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\)|\$.*?\$|==.*?==)/g
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[0.85em] text-foreground border border-border/30">
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <span key={index} className="font-serif italic text-primary/90 px-1">
            {part.slice(1, -1)}
          </span>
        )
      }
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <mark key={index} className="bg-amber-200/40 dark:bg-amber-900/40 text-foreground px-1 py-0.5 rounded">
            {part.slice(2, -2)}
          </mark>
        )
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
          >
            {linkMatch[1]}
          </a>
        )
      }
      return part
    })
  }

  return (
    <div
      onMouseUp={handleMouseUp}
      className={`prose prose-neutral dark:prose-invert max-w-none selection:bg-primary/20 ${className}`}
    >
      {renderBlocks(content)}
    </div>
  )
}
