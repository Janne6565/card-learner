/**
 * DOMPurify wrapper for safe HTML card rendering.
 * Client-only — uses DOMPurify with the browser's native DOM.
 * Import this only from client components ("use client").
 */

import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b", "i", "u", "em", "strong", "s", "sub", "sup",
  "br", "p", "div", "span",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "a",
  "code", "pre",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "hr",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "style",
  "target", "rel", "width", "height",
];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
