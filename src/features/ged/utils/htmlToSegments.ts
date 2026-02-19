/**
 * Parse HTML (e.g. from SunEditor) into text segments with color/background.
 * Used to preserve formatting when rendering to PDF/Word.
 */

export interface HtmlSegment {
  text: string;
  /** Hex color for text, e.g. 'ff0000' */
  color?: string;
  /** Hex color for background/highlight, e.g. 'ffff00' */
  backgroundColor?: string;
  /** Whether text should be bold */
  bold?: boolean;
  /** List type: 'ordered' | 'unordered' | null */
  listType?: 'ordered' | 'unordered' | null;
  /** List item number (for ordered lists) */
  listNumber?: number;
}

/** Parse rgb(r, g, b) or #hex to hex string without #. */
function parseColorToHex(css: string): string | undefined {
  if (!css || typeof css !== 'string') return undefined;
  const s = css.trim();
  const hexMatch = s.match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return hex.toLowerCase();
  }
  const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return r + g + b;
  }
  return undefined;
}

function parseStyle(style: string): { color?: string; backgroundColor?: string } {
  const out: { color?: string; backgroundColor?: string } = {};
  const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
  if (colorMatch) out.color = parseColorToHex(colorMatch[1]);
  const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
  if (bgMatch) out.backgroundColor = parseColorToHex(bgMatch[1]);
  return out;
}

function walk(
  node: Node,
  inherit: { color?: string; backgroundColor?: string; bold?: boolean; listType?: 'ordered' | 'unordered' | null; listNumber?: number; isFirstInListItem?: boolean },
  segments: HtmlSegment[],
  listCounter: { ordered: number; unordered: number } = { ordered: 0, unordered: 0 },
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      segments.push({
        text,
        color: inherit.color,
        backgroundColor: inherit.backgroundColor,
        bold: inherit.bold,
        listType: inherit.listType,
        listNumber: inherit.listNumber,
      });
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tagName = el.tagName?.toLowerCase() || '';
  let current = { ...inherit };
  
  // Handle bold
  if (tagName === 'b' || tagName === 'strong') {
    current.bold = true;
  }
  
  // Handle lists
  if (tagName === 'ol') {
    current.listType = 'ordered';
    listCounter.ordered = 0;
  } else if (tagName === 'ul') {
    current.listType = 'unordered';
    listCounter.unordered = 0;
  } else if (tagName === 'li') {
    // Set list number for this item and mark first child as first
    if (current.listType === 'ordered') {
      listCounter.ordered++;
      current.listNumber = listCounter.ordered;
    } else if (current.listType === 'unordered') {
      listCounter.unordered++;
      current.listNumber = listCounter.unordered;
    }
    current.isFirstInListItem = true;
  }
  
  const styleAttr = el.getAttribute?.('style');
  if (styleAttr) {
    const parsed = parseStyle(styleAttr);
    if (parsed.color) current.color = parsed.color;
    if (parsed.backgroundColor) current.backgroundColor = parsed.backgroundColor;
  }
  
  for (let i = 0; i < el.childNodes.length; i++) {
    const childCurrent = i === 0 && current.isFirstInListItem ? current : { ...current, isFirstInListItem: false };
    walk(el.childNodes[i], childCurrent, segments, listCounter);
  }
}

/**
 * Convert HTML to segments with color/background for PDF/Word rendering.
 */
export function htmlToSegments(html: string): HtmlSegment[] {
  if (!html || typeof html !== 'string') return [];
  if (typeof document === 'undefined') {
    return [{ text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }];
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  const segments: HtmlSegment[] = [];
  walk(div, {}, segments, { ordered: 0, unordered: 0 });
  return segments;
}

/** Convert hex (6 chars) to jsPDF RGB [r,g,b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

/** Default description color for PDF/Word (dark gray). */
export const DEFAULT_DESC_COLOR = '374151';

/** Parse text-align from HTML (e.g. <p style="text-align: center">). */
export function parseHtmlAlignment(html: string): 'left' | 'center' | 'right' {
  if (!html || typeof html !== 'string') return 'left';
  const centerMatch = /text-align\s*:\s*center/i.test(html);
  const rightMatch = /text-align\s*:\s*right/i.test(html);
  if (centerMatch) return 'center';
  if (rightMatch) return 'right';
  return 'left';
}

/** Map hex background color to Word HighlightColor. Returns undefined if no close match. */
export function hexToWordHighlight(hex: string): string | undefined {
  if (!hex || hex.length < 6) return undefined;
  const h = hex.toLowerCase();
  const map: Record<string, string> = {
    ffff00: 'yellow',
    fff000: 'yellow',
    '00ff00': 'green',
    '0000ff': 'blue',
    ff0000: 'red',
    'ff00ff': 'magenta',
    '00ffff': 'cyan',
    '808080': 'lightGray',
    'c0c0c0': 'lightGray',
  };
  if (map[h]) return map[h];
  // Fuzzy match: red family
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (r > 200 && g < 100 && b < 100) return 'red';
  if (r < 100 && g > 200 && b < 100) return 'green';
  if (r < 100 && g < 100 && b > 200) return 'blue';
  if (r > 200 && g > 200 && b < 100) return 'yellow';
  if (r > 200 && g < 100 && b > 200) return 'magenta';
  if (r < 100 && g > 200 && b > 200) return 'cyan';
  return 'yellow'; // fallback
}
