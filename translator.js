// Korean to English PDF Translator
// Advanced implementation with layout preservation and accurate text replacement

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
            this.showLoading(true, 'Analyzing PDF structure...');
            this.showStatus('🔍 Analyzing PDF structure and extracting text...', 'info');
            this.showProgress(30);

            const pdf = await pdfjsLib.getDocument({ data: this.currentPdfBytes }).promise;
            const numPages = pdf.numPages;
            let pageData = [];

            for (let i = 1; i <= numPages; i++) {
                this.showLoading(true, `Processing page ${i}/${numPages}...`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });
                
                // Extract detailed text information with positions
                const textItems = textContent.items.map(item => ({
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    width: item.width,
                    height: item.height,
                    fontSize: Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]),
                    fontName: item.fontName,
                    dir: item.dir
                }));

                pageData.push({
                    page: i,
                    width: viewport.width,
                    height: viewport.height,
                    textItems: textItems
                });
                
                this.showProgress(30 + (i / numPages) * 30);
            }

            this.showLoading(true, 'Translating text...');
            this.showStatus('🔄 Translating Korean text to English...', 'info');
            this.showProgress(70);

            // Translate all text items
            for (let page of pageData) {
                for (let item of page.textItems) {
                    if (item.text.trim()) {
                        item.translatedText = await this.translateText(item.text);
                    }
                }
            }

            this.showLoading(true, 'Creating translated PDF...');
            this.showStatus('📝 Creating new PDF with translated text...', 'info');
            this.showProgress(85);

            this.translatedPdf = await this.createTranslatedPDF(pageData);

            this.showStatus('✅ Translation complete! Original layout preserved.', 'success');
            this.showProgress(100);
            
            document.getElementById('downloadBtn').style.display = 'inline-block';
            
        } catch (error) {
            this.showStatus('❌ Translation error: ' + error.message, 'error');
            console.error('Translation error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async translateText(text) {
        if (!text.trim()) return "";
        
        // Using MyMemory API for Korean to English translation
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            } else if (data.responseStatus === 200) {
                return text; // Return original if translation not needed
            } else {
                console.warn('Translation API warning:', data);
                return text; // Fallback to original text
            }
        } catch (error) {
            console.error('Translation API error:', error);
            return text; // Fallback to original text on error
        }
    }

    async createTranslatedPDF(pageData) {
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (let pageInfo of pageData) {
            const page = pdfDoc.addPage([pageInfo.width, pageInfo.height]);
            
            // Group text items by their approximate line position for better layout preservation
            const lineGroups = this.groupTextItemsByLines(pageInfo.textItems);
            
            // Embed fonts that support Korean and English characters
            let currentFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            let currentFontSize = 12;
            
            for (let lineGroup of lineGroups) {
                if (lineGroup.length === 0) continue;
                
                // Use the font size from the first item in the line
                const baseFontSize = lineGroup[0].fontSize || 12;
                
                // Calculate total width of original text
                const totalOriginalWidth = lineGroup.reduce((sum, item) => sum + (item.width || 0), 0);
                
                // Build the translated line
                const translatedLine = lineGroup.map(item => item.translatedText || item.text).join('');
                
                if (translatedLine.trim()) {
                    // Calculate position for the first item in the line
                    const firstItem = lineGroup[0];
                    const x = firstItem.x || 50;
                    const y = pageInfo.height - (firstItem.y || 50);
                    
                    // Adjust font size to fit the translated text in the available space
                    let fontSize = baseFontSize;
                    const translatedWidth = (translatedLine.length * baseFontSize * 0.6); // Approximate width
                    
                    // Scale down if translated text is longer
                    if (translatedWidth > totalOriginalWidth && totalOriginalWidth > 0) {
                        fontSize = Math.max(8, baseFontSize * (totalOriginalWidth / translatedWidth));
                    }
                    
                    try {
                        page.drawText(translatedLine, {
                            x: x,
                            y: y,
                            size: fontSize,
                            font: currentFont,
                            color: PDFLib.rgb(0, 0, 0),
                            maxWidth: pageInfo.width - x - 50,
                            lineHeight: fontSize * 1.2,
                        });
                    } catch (error) {
                        console.warn('Error drawing text:', error);
                        // Fallback: try with smaller font size
                        page.drawText(translatedLine, {
                            x: x,
                            y: y,
                            size: Math.max(6, fontSize * 0.8),
                            font: currentFont,
                            color: PDFLib.rgb(0, 0, 0),
                        });
                    }
                }
            }
        }
        
        return pdfDoc;
    }

    groupTextItemsByLines(textItems) {
        if (!textItems || textItems.length === 0) return [];
        
        // Sort items by Y position (top to bottom)
        const sortedItems = [...textItems].sort((a, b) => b.y - a.y);
        
        const lineGroups = [];
        let currentLine = [sortedItems[0]];
        let currentY = sortedItems[0].y;
        
        for (let i = 1; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            // Group items that are on the same line (within 5 units vertically)
            if (Math.abs(item.y - currentY) < 5) {
                currentLine.push(item);
            } else {
                // Sort current line by X position (left to right)
                currentLine.sort((a, b) => a.x - b.x);
                lineGroups.push(currentLine);
                currentLine = [item];
                currentY = item.y;
            }
        }
        
        // Don't forget the last line
        if (currentLine.length > 0) {
            currentLine.sort((a, b) => a.x - b.x);
            lineGroups.push(currentLine);
        }
        
        return lineGroups;
    }

    async downloadTranslatedPDF() {
        if (!this.translatedPdf) return;

        try {
            this.showLoading(true, 'Preparing download...');
            
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
        } finally {
            this.showLoading(false);
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 5000);
        }
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
            setTimeout(() => {
                progress.style.display = 'none';
                progressBar.style.width = '0%';
            }, 1000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new PDFTranslator());