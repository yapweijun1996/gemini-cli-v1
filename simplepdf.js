// Simple PDF generation library
// Builds a PDF file using JavaScript only. Supports basic text drawing
// and converts simple HTML content to PDF.

class SimplePDF {
  constructor() {
    // Array of PDF objects as strings
    this.objects = ['', '']; // placeholders for catalog and pages
    this.pages = [];
    this.rootIndex = 1; // catalog object number
    this.pagesIndex = 2; // pages tree object number
    this.fonts = {};
    this.addStandardFonts();
    this.addPage();
  }

  // Registers built in fonts that are available in PDF readers
  addStandardFonts() {
    const baseFonts = {
      F1: 'Helvetica',
      F2: 'Helvetica-Bold',
      F3: 'Helvetica-Oblique',
      F4: 'Helvetica-BoldOblique'
    };
    Object.entries(baseFonts).forEach(([alias, name]) => {
      const idx = this.addObject(
        `<< /Type /Font /Subtype /Type1 /Name /${alias} /BaseFont /${name} >>`
      );
      this.fonts[alias] = `${idx} 0 R`;
    });
  }

  // Adds an object to the objects array and returns its index (1-based)
  addObject(str) {
    this.objects.push(str);
    return this.objects.length; // object numbers start at 1
  }

  // Starts a new page
  addPage(width = 595.28, height = 841.89) {
    const contentIndex = this.addObject(''); // placeholder for page stream
    const pageIndex = this.addObject(''); // placeholder for page dictionary
    const page = {
      width,
      height,
      contentIndex,
      pageIndex,
      content: []
    };
    this.pages.push(page);
    this.currentPage = page;
    this.pageWidth = width;
    this.pageHeight = height;
  }

  // Escapes text for PDF syntax
  _escape(text) {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  // Draws text at (x, y) with options
  text(x, y, txt, { font = 'F1', size = 12, color = '0 0 0', underline = false } = {}) {
    const escaped = this._escape(txt);
    const ops = [
      'BT',
      `/${font} ${size} Tf`,
      `${color} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${escaped}) Tj`,
      'ET'
    ];
    this.currentPage.content.push(ops.join(' '));
    if (underline) {
      const width = this._measureTextWidth(txt, { font, size });
      const uy = y - 1;
      this.currentPage.content.push(
        `${color} RG ${x.toFixed(2)} ${uy.toFixed(2)} m ${(x + width).toFixed(2)} ${uy.toFixed(2)} l S`
      );
    }
  }

  // Draws a straight line
  line(x1, y1, x2, y2, color = '0 0 0') {
    this.currentPage.content.push(
      `${color} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  }

  // Canvas is used for text width measurement
  _measureTextWidth(txt, { font = 'F1', size = 12 }) {
    if (!this._ctx) {
      const c = document.createElement('canvas');
      this._ctx = c.getContext('2d');
    }
    const style = {
      F1: '',
      F2: 'bold',
      F3: 'italic',
      F4: 'bold italic'
    }[font] || '';
    this._ctx.font = `${style} ${size}px Helvetica`;
    return this._ctx.measureText(txt).width;
  }

  // Finalizes PDF objects and returns the complete PDF text
  _buildPDF() {
    // Finalize each page's objects
    this.pages.forEach((p) => {
      const stream = p.content.join('\n');
      this.objects[p.contentIndex - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      this.objects[p.pageIndex - 1] =
        `<< /Type /Page /Parent ${this.pagesIndex} 0 R /MediaBox [0 0 ${p.width} ${p.height}] ` +
        `/Resources << /Font << ${Object.entries(this.fonts)
          .map(([a, r]) => `/${a} ${r}`)
          .join(' ')} >> >> /Contents ${p.contentIndex} 0 R >>`;
    });

    // Pages tree and catalog
    const kids = this.pages.map((p) => `${p.pageIndex} 0 R`).join(' ');
    this.objects[this.pagesIndex - 1] = `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`;
    this.objects[this.rootIndex - 1] = `<< /Type /Catalog /Pages ${this.pagesIndex} 0 R >>`;

    // Write PDF body
    let pdf = '%PDF-1.4\n';
    const offsets = [];
    this.objects.forEach((obj, i) => {
      offsets[i] = pdf.length;
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefPos = pdf.length;
    pdf += `xref\n0 ${this.objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach((o) => {
      pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${this.objects.length + 1} /Root ${this.rootIndex} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return pdf;
  }

  // Returns PDF as Blob
  toBlob() {
    const pdfString = this._buildPDF();
    return new Blob([pdfString], { type: 'application/pdf' });
  }

  // Triggers download of the PDF
  download(filename = 'document.pdf') {
    const url = URL.createObjectURL(this.toBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Utility to convert CSS color to PDF color values
function cssColorToRgb(color) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  const computed = ctx.fillStyle; // rgb(r, g, b)
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = (parseInt(m[1]) / 255).toFixed(3);
    const g = (parseInt(m[2]) / 255).toFixed(3);
    const b = (parseInt(m[3]) / 255).toFixed(3);
    return `${r} ${g} ${b}`;
  }
  return '0 0 0';
}

// Converts a DOM element with very simple HTML to PDF
function htmlToPdf(element, filename = 'document.pdf') {
  const pdf = new SimplePDF();
  const margin = 40;
  let x = margin;
  let y = pdf.pageHeight - margin;
  const lineFactor = 1.2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const baseStyle = {
    fontSize: 12,
    color: '#000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false
  };

  // Determines canvas font string from style
  function canvasFont(style) {
    const weight = style.fontWeight === 'bold' ? 'bold' : 'normal';
    const italic = style.fontStyle === 'italic' ? 'italic' : '';
    return `${weight} ${italic} ${style.fontSize}px Helvetica`;
  }

  // Converts style to PDF text options
  function styleToOptions(style) {
    let font = 'F1';
    if (style.fontWeight === 'bold' && style.fontStyle === 'italic') font = 'F4';
    else if (style.fontWeight === 'bold') font = 'F2';
    else if (style.fontStyle === 'italic') font = 'F3';
    return {
      font,
      size: style.fontSize,
      color: cssColorToRgb(style.color),
      underline: style.underline
    };
  }

  // Moves to next line, adds new pages when necessary
  function newLine(style) {
    x = margin;
    y -= style.fontSize * lineFactor;
    if (y < margin) {
      pdf.addPage();
      y = pdf.pageHeight - margin;
    }
  }

  // Writes text with simple word wrapping
  function writeText(text, style) {
    ctx.font = canvasFont(style);
    text.split(/\s+/).forEach((word) => {
      if (!word) return;
      const metrics = ctx.measureText(word + ' ');
      if (x + metrics.width > pdf.pageWidth - margin) {
        newLine(style);
      }
      const options = styleToOptions(style);
      pdf.text(x, y, word + ' ', options);
      if (options.underline) {
        pdf.line(x, y - 1, x + metrics.width, y - 1, options.color);
      }
      x += metrics.width;
    });
  }

  // Recursively processes DOM nodes
  function process(node, style) {
    if (node.nodeType === Node.TEXT_NODE) {
      writeText(node.textContent, style);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      let s = { ...style };
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        s.fontSize = 24 - parseInt(tag[1]) * 2;
        s.fontWeight = 'bold';
        newLine(style);
      } else if (tag === 'p') {
        newLine(style);
      } else if (tag === 'br') {
        newLine(style);
      } else if (tag === 'b' || tag === 'strong') {
        s.fontWeight = 'bold';
      } else if (tag === 'i' || tag === 'em') {
        s.fontStyle = 'italic';
      } else if (tag === 'u') {
        s.underline = true;
      }
      if (node.style) {
        if (node.style.color) s.color = node.style.color;
        if (node.style.fontSize) s.fontSize = parseInt(node.style.fontSize);
        if (node.style.fontWeight) s.fontWeight = node.style.fontWeight;
        if (node.style.fontStyle) s.fontStyle = node.style.fontStyle;
        if (node.style.textDecoration) s.underline = node.style.textDecoration.includes('underline');
      }
      node.childNodes.forEach((child) => process(child, s));
      if (tag === 'p' || /^h[1-6]$/.test(tag)) {
        newLine(s);
      }
    }
  }

  process(element, baseStyle);
  pdf.download(filename);
}

// Exporting functions to global scope for usage
window.SimplePDF = SimplePDF;
window.htmlToPdf = htmlToPdf;
