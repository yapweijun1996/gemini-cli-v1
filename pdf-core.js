// Simple PDF builder core
// This module handles basic PDF structure generation without HTML parsing.
// It demonstrates how to create a PDF using JavaScript only.

class SimplePDFCore {
  constructor() {
    // PDF objects will be stored as strings in this array.
    // The first two slots are reserved for the catalog and pages tree objects.
    this.objects = ['', ''];
    this.pages = [];
    this.catalogIndex = 1; // catalog object number
    this.pagesIndex = 2;   // pages tree object number
    this.fonts = {};
    this._addStandardFont();
  }

  // Registers a single built-in font (Helvetica) for simplicity.
  _addStandardFont() {
    const idx = this._addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    this.fonts.F1 = `${idx} 0 R`;
  }

  // Appends a new object and returns its 1-based index.
  _addObject(str) {
    this.objects.push(str);
    return this.objects.length;
  }

  // Starts a new page with optional width/height in points (A4 default).
  addPage(width = 595.28, height = 841.89) {
    const contentIndex = this._addObject(''); // placeholder for page stream
    const pageIndex = this._addObject('');    // placeholder for page dictionary
    const page = {
      width,
      height,
      contentIndex,
      pageIndex,
      content: []
    };
    this.pages.push(page);
    this.currentPage = page;
  }

  // Escapes text so it is valid PDF syntax.
  _escape(text) {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  // Adds a text drawing command to the current page.
  text(x, y, txt, { font = 'F1', size = 12 } = {}) {
    const escaped = this._escape(txt);
    const ops = [
      'BT',
      `/${font} ${size} Tf`,
      `${x.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${escaped}) Tj`,
      'ET'
    ];
    this.currentPage.content.push(ops.join(' '));
  }

  // Constructs the final PDF string from all stored objects.
  _build() {
    // Finalize page objects
    this.pages.forEach((p) => {
      const stream = p.content.join('\n');
      this.objects[p.contentIndex - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      this.objects[p.pageIndex - 1] = `<< /Type /Page /Parent ${this.pagesIndex} 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Resources << /Font << /F1 ${this.fonts.F1} >> >> /Contents ${p.contentIndex} 0 R >>`;
    });

    const kids = this.pages.map(p => `${p.pageIndex} 0 R`).join(' ');
    this.objects[this.pagesIndex - 1] = `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`;
    this.objects[this.catalogIndex - 1] = `<< /Type /Catalog /Pages ${this.pagesIndex} 0 R >>`;

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
    offsets.forEach(o => {
      pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${this.objects.length + 1} /Root ${this.catalogIndex} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return pdf;
  }

  // Returns the PDF as a Blob so it can be downloaded.
  toBlob() {
    const pdfString = this._build();
    return new Blob([pdfString], { type: 'application/pdf' });
  }

  // Helper that triggers a file download in the browser.
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

// Expose to global scope for demos/usage
window.SimplePDFCore = SimplePDFCore;
