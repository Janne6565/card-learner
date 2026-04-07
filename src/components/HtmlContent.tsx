"use client";

import { sanitizeHtml } from "@/lib/sanitize";

interface HtmlContentProps {
  html: string;
  className?: string;
}

/** Client component that safely renders HTML using DOMPurify */
export default function HtmlContent({ html, className }: HtmlContentProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
