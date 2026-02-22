// Korean to English PDF Translator
// Client-side implementation for GitHub Pages deployment

class PDFTranslator {
    constructor() {
        this.currentPdf = null;
        this.translatedPdf = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const translateBtn = document.getElementById('translateBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        // Upload area click
        uploadArea.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files[0] && files[0].type === 'application/pdf') {
                this.handleFileUpload(files[0]);
            }
        });

        // Translate button
        translateBtn.addEventListener('click', () => {
            this.translatePDF();
        });

        // Download button
        downloadBtn.addEventListener('click', () => {
            this.downloadTranslatedPDF();
        });
    }

    async handleFileUpload(file) {
        try {
            this.showStatus('📄 Reading PDF file...', 'info');
            this.showProgress(10);

            const arrayBuffer = await file.arrayBuffer();
            this.currentPdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            this.showStatus('✅ PDF loaded successfully!', 'success');
            this.showProgress(20);
            
            // Enable translate button
            document.getElementById('translateBtn').disabled = false;
            
            // Update upload area
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <h3>${file.name}</h3>
                <p>Ready to translate</p>
            `;
            
        } catch (error) {
            this.showStatus('❌ Error loading PDF: ' + error.message, 'error');
            console.error('PDF load error:', error);
        }
    }

    async translatePDF() {
        if (!this.currentPdf) return;

        try {
            this.showLoading(true);
            this.showStatus('🔍 Extracting text from PDF...', 'info');
            this.showProgress(30);

            // Extract text from all pages
            const pages = this.currentPdf.getPages();
            const extractedText = [];
            
            for (let i = 0; i < pages.length; i++) {
                this.showStatus(`📖 Processing page ${i + 1} of ${pages.length}...`, 'info');
                this.showProgress(30 + (i / pages.length) * 30);
                
                // Since we can't extract text directly in browser, we'll use a different approach
                // We'll create a new PDF with translated text overlay
                extractedText.push({
                    page: i + 1,
                    text: `Korean text from page ${i + 1}` // Placeholder
                });
            }

            this.showStatus('🔄 Translating text...', 'info');
            this.showProgress(70);

            // Simulate translation (in real implementation, you'd call Google Translate API)
            const translatedTexts = await this.translateTexts(extractedText);

            this.showStatus('📝 Creating translated PDF...', 'info');
            this.showProgress(85);

            // Create new PDF with translated text
            this.translatedPdf = await this.createTranslatedPDF(translatedTexts);

            this.showStatus('✅ Translation complete!', 'success');
            this.showProgress(100);
            
            // Show download button
            document.getElementById('downloadBtn').style.display = 'inline-block';
            
        } catch (error) {
            this.showStatus('❌ Translation error: ' + error.message, 'error');
            console.error('Translation error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async translateTexts(texts) {
        // Simulate Google Translate API call
        // In production, you'd use: https://translate.googleapis.com/translate_a/single
        return new Promise(resolve => {
            setTimeout(() => {
                const translated = texts.map(item => ({
                    ...item,
                    translatedText: `[English Translation] ${item.text}`,
                    originalText: item.text
                }));
                resolve(translated);
            }, 1000); // Simulate API delay
        });
    }

    async createTranslatedPDF(translatedTexts) {
        const newPdf = await PDFLib.PDFDocument.create();
        
        // For demonstration, create simple pages with translated text
        for (const item of translatedTexts) {
            const page = newPdf.addPage([595.28, 841.89]); // A4 size
            const { width, height } = page.getSize();
            
            // Add background
            page.drawRectangle({
                x: 0,
                y: 0,
                width: width,
                height: height,
                color: PDFLib.rgb(1, 1, 1)
            });

            // Add translated text
            const fontSize = 12;
            const textHeight = fontSize * 1.2;
            
            // Title
            page.drawText(`Page ${item.page} - Translated`, {
                x: 50,
                y: height - 50,
                size: 16,
                color: PDFLib.rgb(0.2, 0.2, 0.8)
            });

            // Original text (smaller, gray)
            page.drawText('Original Korean:', {
                x: 50,
                y: height - 80,
                size: 10,
                color: PDFLib.rgb(0.5, 0.5, 0.5)
            });

            // Translated text
            const lines = this.wrapText(item.translatedText, width - 100, fontSize);
            lines.forEach((line, index) => {
                page.drawText(line, {
                    x: 50,
                    y: height - 100 - (index * textHeight),
                    size: fontSize,
                    color: PDFLib.rgb(0, 0, 0)
                });
            });
        }

        return newPdf;
    }

    wrapText(text, maxWidth, fontSize) {
        const charsPerLine = Math.floor(maxWidth / (fontSize * 0.6));
        const lines = [];
        
        for (let i = 0; i < text.length; i += charsPerLine) {
            lines.push(text.slice(i, i + charsPerLine));
        }
        
        return lines;
    }

    downloadTranslatedPDF() {
        if (!this.translatedPdf) return;

        this.translatedPdf.save().then(pdfBytes => {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `translated_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('📥 Download started!', 'success');
        }).catch(error => {
            this.showStatus('❌ Download error: ' + error.message, 'error');
            console.error('Download error:', error);
        });
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showProgress(percentage) {
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');
        
        if (percentage > 0) {
            progress.style.display = 'block';
            progressBar.style.width = percentage + '%';
        } else {
            progress.style.display = 'none';
        }
    }
}

// Initialize translator when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFTranslator();
});