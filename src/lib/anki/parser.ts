/**
 * Anki TXT export parser.
 *
 * Reads header lines (#separator, #html, #guid column, etc.) and
 * then parses tab/comma/semicolon-separated data rows into cards.
 */

export interface ParsedCard {
  guid?: string;
  notetype?: string;
  front: string;
  back: string;
  tags: string[];
  isHtml: boolean;
}

export interface ParseResult {
  deckName?: string;
  cards: ParsedCard[];
}

interface ColumnMapping {
  guid?: number;
  notetype?: number;
  deck?: number;
  tags?: number;
}

/**
 * Parse an Anki-format TXT export string.
 *
 * Header lines start with `#` and configure:
 *   #separator:tab | #separator:comma | #separator:semicolon | #separator:<char>
 *   #html:true | #html:false
 *   #guid column:<n>   (1-indexed)
 *   #notetype column:<n>
 *   #deck column:<n>
 *   #tags column:<n>
 *
 * Remaining columns (not mapped to metadata) are treated as field columns.
 * The first two field columns are front and back.
 *
 * Deduplicates on guid within the import.
 */
export function parseAnkiTxt(text: string): ParseResult {
  const lines = text.split(/\r?\n/);

  let separator = "\t";
  let isHtml = true;
  const columnMapping: ColumnMapping = {};

  // ── Parse header lines ──
  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("#")) {
      dataStartIndex = i;
      break;
    }
    dataStartIndex = i + 1;

    const headerContent = line.slice(1).trim(); // remove leading #

    if (headerContent.startsWith("separator:")) {
      const sepValue = headerContent.slice("separator:".length);
      if (sepValue === "tab") separator = "\t";
      else if (sepValue === "comma") separator = ",";
      else if (sepValue === "semicolon") separator = ";";
      else if (sepValue.length === 1) separator = sepValue;
    } else if (headerContent.startsWith("html:")) {
      isHtml = headerContent.slice("html:".length).trim().toLowerCase() === "true";
    } else if (headerContent.startsWith("guid column:")) {
      columnMapping.guid = parseInt(headerContent.slice("guid column:".length).trim(), 10) - 1;
    } else if (headerContent.startsWith("notetype column:")) {
      columnMapping.notetype = parseInt(headerContent.slice("notetype column:".length).trim(), 10) - 1;
    } else if (headerContent.startsWith("deck column:")) {
      columnMapping.deck = parseInt(headerContent.slice("deck column:".length).trim(), 10) - 1;
    } else if (headerContent.startsWith("tags column:")) {
      columnMapping.tags = parseInt(headerContent.slice("tags column:".length).trim(), 10) - 1;
    }
  }

  // ── Identify field columns (all columns NOT mapped to metadata) ──
  const metadataColumns = new Set<number>();
  if (columnMapping.guid !== undefined) metadataColumns.add(columnMapping.guid);
  if (columnMapping.notetype !== undefined) metadataColumns.add(columnMapping.notetype);
  if (columnMapping.deck !== undefined) metadataColumns.add(columnMapping.deck);
  if (columnMapping.tags !== undefined) metadataColumns.add(columnMapping.tags);

  // ── Parse data rows ──
  const cards: ParsedCard[] = [];
  const seenGuids = new Set<string>();
  let deckName: string | undefined;

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = splitRow(line, separator);

    // Extract metadata columns
    const guid = columnMapping.guid !== undefined ? fields[columnMapping.guid]?.trim() : undefined;
    const notetype = columnMapping.notetype !== undefined ? fields[columnMapping.notetype]?.trim() : undefined;
    const deckPath = columnMapping.deck !== undefined ? fields[columnMapping.deck]?.trim() : undefined;
    const tagsRaw = columnMapping.tags !== undefined ? fields[columnMapping.tags]?.trim() : undefined;

    // Extract deck name from first row with a deck path
    if (deckPath && !deckName) {
      // Use first segment of :: path as suggested deck name
      const segments = deckPath.split("::");
      deckName = segments[0].trim();
    }

    // Dedupe on guid
    if (guid) {
      if (seenGuids.has(guid)) continue;
      seenGuids.add(guid);
    }

    // Field columns: all columns not mapped to metadata
    const fieldValues: string[] = [];
    for (let j = 0; j < fields.length; j++) {
      if (!metadataColumns.has(j)) {
        fieldValues.push(fields[j]);
      }
    }

    const front = fieldValues[0] ?? "";
    const back = fieldValues[1] ?? "";

    if (!front && !back) continue;

    // Parse tags: space-separated
    const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];

    cards.push({
      guid,
      notetype,
      front: decodeHtmlEntities(front),
      back: decodeHtmlEntities(back),
      tags,
      isHtml,
    });
  }

  return { deckName, cards };
}

/**
 * Split a row by separator, respecting quoted fields.
 * Quoted fields start and end with `"`, and `""` escapes a literal quote.
 */
function splitRow(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"' && current === "") {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (line.startsWith(separator, i)) {
        fields.push(current);
        current = "";
        i += separator.length;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Decode common HTML entities. We keep HTML tags intact when isHtml is true;
 * sanitization happens at render time via DOMPurify.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}
