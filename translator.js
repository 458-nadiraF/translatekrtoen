// Korean to English PDF Translator
// Client-side implementation with real text extraction and translation

class PDFTranslator {
    constructor() {
        this.currentPdfBytes = null;
        this.translatedPdf = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const translateBtn = document.getElementById('translateBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'dragover') uploadArea.classList.add('dragover');
                if (eventName === 'dragleave' || eventName === 'drop') uploadArea.classList.remove('dragover');
                if (eventName === 'drop') this.handleFileUpload(e.dataTransfer.files[0]);
            });
        });

        translateBtn.addEventListener('click', () => this.translatePDF());
        downloadBtn.addEventListener('click', () => this.downloadTranslatedPDF());
    }

    async handleFileUpload(file) {
        if (!file || file.type !== 'application/pdf') {
            this.showStatus('❌ Please upload a valid PDF file.', 'error');
            return;
        }

        try {
            this.showStatus('📄 Reading PDF file...', 'info');
            this.showProgress(10);

            this.currentPdfBytes = await file.arrayBuffer();
            
            this.showStatus('✅ PDF loaded successfully!', 'success');
            this.showProgress(20);
            
            document.getElementById('translateBtn').disabled = false;
            
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
        if (!this.currentPdfBytes) return;

        try {
            this.showLoading(true, 'Extracting text...');
            this.showStatus('🔍 Extracting text from PDF...', 'info');
            this.showProgress(30);

            const pdf = await pdfjsLib.getDocument({ data: this.currentPdfBytes }).promise;
            const numPages = pdf.numPages;
            let extractedTexts = [];

            for (let i = 1; i <= numPages; i++) {
                this.showLoading(true, `Extracting text from page ${i}/${numPages}...`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedTexts.push({ page: i, text: pageText });
                this.showProgress(30 + (i / numPages) * 30);
            }

            this.showLoading(true, 'Translating text...');
            this.showStatus('🔄 Translating text...', 'info');
            this.showProgress(70);

            const translatedTexts = await this.translateAllPages(extractedTexts);

            this.showLoading(true, 'Creating translated PDF...');
            this.showStatus('📝 Creating translated PDF...', 'info');
            this.showProgress(85);

            this.translatedPdf = await this.createTranslatedPDF(translatedTexts);

            this.showStatus('✅ Translation complete!', 'success');
            this.showProgress(100);
            
            document.getElementById('downloadBtn').style.display = 'inline-block';
            
        } catch (error) {
            this.showStatus('❌ Translation error: ' + error.message, 'error');
            console.error('Translation error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async translateAllPages(pages) {
        let translatedPages = [];
        for (let i = 0; i < pages.length; i++) {
            this.showLoading(true, `Translating page ${i + 1}/${pages.length}...`);
            const translatedText = await this.translateText(pages[i].text);
            translatedPages.push({ ...pages[i], translatedText });
            this.showProgress(70 + (i / pages.length) * 15);
        }
        return translatedPages;
    }

    async translateText(text) {
        if (!text.trim()) return "";
        // Using a free, public API for demonstration. For production, use an official API with a key.
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (error) {
            console.error('Translation API error:', error);
            return "[Translation Failed]";
        }
    }

    async createTranslatedPDF(translatedTexts) {
        const pdfDoc = await PDFLib.PDFDocument.load(this.currentPdfBytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            const translatedPage = translatedTexts.find(p => p.page === i + 1);

            if (translatedPage && translatedPage.translatedText) {
                // Draw a white rectangle to cover the old text.
                // This is a simple approach; more advanced methods would be needed for complex layouts.
                page.drawRectangle({
                    x: 0,
                    y: 0,
                    width,
                    height,
                    color: PDFLib.rgb(1, 1, 1),
                });

                page.drawText(translatedPage.translatedText, {
                    x: 50,
                    y: height - 50,
                    size: 12,
                    font,
                    color: PDFLib.rgb(0, 0, 0),
                    maxWidth: width - 100,
                    lineHeight: 14,
                });
            }
        }
        return pdfDoc;
    }

    async downloadTranslatedPDF() {
        if (!this.translatedPdf) return;

        try {
            const pdfBytes = await this.translatedPdf.save();
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
        } catch (error) {
            this.showStatus('❌ Download error: ' + error.message, 'error');
            console.error('Download error:', error);
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
    }

    showLoading(show, text = 'Processing...') {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        document.getElementById('loadingText').textContent = text;
    }

    showProgress(percentage) {
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');
        
        progress.style.display = 'block';
        progressBar.style.width = percentage + '%';
        if (percentage >= 100) {
            setTimeout(() => { progress.style.display = 'none'; }, 1000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new PDFTranslator());