/**
 * Render HTML content to PDF using html2canvas + jsPDF.
 * This preserves all HTML formatting (bold, colors, lists, alignment) perfectly.
 * HTML is the source of truth - no manual parsing needed.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Sanitize HTML to prevent XSS and ensure predictable rendering.
 * Keeps only safe formatting tags and attributes.
 */
export function sanitizeHtmlForPdf(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // Create a temporary div to parse HTML
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Allowed tags for PDF rendering
  const allowedTags = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ol', 'ul', 'li',
    'span', 'div', 'br',
    'img',
  ];
  
  // Remove disallowed tags but keep their content
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    
    if (!allowedTags.includes(tagName)) {
      // Replace with span to preserve content
      const span = document.createElement('span');
      while (el.firstChild) {
        span.appendChild(el.firstChild);
      }
      el.parentNode?.replaceChild(span, el);
      return;
    }
    
    // Remove dangerous attributes, keep only style, src, alt
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name !== 'style' && attr.name !== 'src' && attr.name !== 'alt') {
        el.removeAttribute(attr.name);
      }
    });
    
    // Recursively process children
    Array.from(el.childNodes).forEach(walk);
  };
  
  walk(div);
  return div.innerHTML;
}

/**
 * Render HTML content to a PDF document at a specific position.
 * Returns the new Y position after rendering.
 * 
 * Uses html2canvas to render HTML as an image, preserving all formatting perfectly.
 * This is the industry-standard approach for HTML-to-PDF conversion in browsers.
 */
export async function renderHtmlToPdf(
  doc: jsPDF,
  html: string,
  x: number,
  y: number,
  width: number,
  maxY: number,
  options?: {
    fontSize?: number;
    lineHeight?: number;
    color?: string;
  },
): Promise<number> {
  if (!html || !html.trim()) return y;
  
  const sanitized = sanitizeHtmlForPdf(html);
  if (!sanitized) return y;
  
  // Create a temporary container with PDF-optimized CSS
  // Use pixels for html2canvas (it works in pixels)
  const widthPx = width * 3.779527559; // Convert mm to pixels (1mm = 3.779527559px at 96dpi)
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${widthPx}px`;
  container.style.fontFamily = 'Helvetica, Arial, sans-serif';
  container.style.fontSize = `${(options?.fontSize || 10) * 1.33}px`; // Convert pt to px (1pt = 1.33px)
  container.style.lineHeight = `${options?.lineHeight || 1.55}`;
  container.style.color = options?.color || '#374151';
  container.style.padding = '10px';
  container.style.margin = '0';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = sanitized;
  
  document.body.appendChild(container);
  
  try {
    // For cell content (like in Suivi), we should NOT add page breaks here
    // The row-level pagination should handle page breaks to keep Avant/Après together
    // Instead, we'll clip the content if it's too tall
    let currentY = y;
    
    // Render HTML to canvas using html2canvas
    // This preserves all formatting (bold, colors, lists, alignment, fonts)
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale = better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: widthPx,
      windowWidth: widthPx,
    });
    
    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions in mm
    const imgWidth = width; // Use the requested width
    let imgHeight = (canvas.height / canvas.width) * width;
    
    // Clip height if it exceeds available space (don't add page break)
    if (currentY + imgHeight > maxY) {
      imgHeight = Math.max(10, maxY - currentY - 2);
    }
    
    // Add image to PDF
    doc.addImage(imgData, 'PNG', x, currentY, imgWidth, imgHeight);
    
    return currentY + imgHeight + 2; // Add small gap
  } catch (error) {
    console.error('Error rendering HTML to PDF:', error);
    // Fallback: return original Y position
    return y;
  } finally {
    document.body.removeChild(container);
  }
}
