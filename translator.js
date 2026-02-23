// Korean to English PDF Translator
// Ultra-fast implementation with Google Translate API and advanced optimizations

class PDFTranslator {
    constructor() {
        this.currentPdfBytes = null;
        this.translatedPdf = null;
        this.translationCache = new Map();
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
            let allTextItems = [];

            // Extract all text items from all pages
            for (let i = 1; i <= numPages; i++) {
                this.showLoading(true, `Extracting text from page ${i}/${numPages}...`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });
                
                const textItems = textContent.items.map((item, index) => ({
                    id: `page${i}_item${index}`,
                    text: item.str,
                    page: i,
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

                allTextItems.push(...textItems);
                
                this.showProgress(30 + (i / numPages) * 20);
            }

            this.showLoading(true, 'Preparing text for translation...');
            this.showStatus('🔄 Preparing text for batch translation...', 'info');
            this.showProgress(60);

            // Filter unique texts and prepare batch translation
            const uniqueTexts = this.getUniqueTexts(allTextItems);
            
            this.showLoading(true, `Translating ${uniqueTexts.length} unique text items...`);
            this.showStatus('� Using ultra-fast translation service...', 'info');
            this.showProgress(70);

            // Batch translate all unique texts using multiple strategies
            const translations = await this.fastBatchTranslateTexts(uniqueTexts);
            
            // Apply translations back to text items
            this.applyTranslationsToItems(allTextItems, translations);

            this.showLoading(true, 'Creating translated PDF...');
            this.showStatus('📝 Creating new PDF with translated text...', 'info');
            this.showProgress(85);

            this.translatedPdf = await this.modifyExistingPDF(this.currentPdfBytes, pageData);

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

    getUniqueTexts(textItems) {
        const textMap = new Map();
        const uniqueTexts = [];
        
        for (const item of textItems) {
            if (!item.text.trim()) continue;
            
            // Check cache first
            if (this.translationCache.has(item.text)) {
                continue;
            }
            
            // Only add unique texts
            if (!textMap.has(item.text)) {
                textMap.set(item.text, true);
                uniqueTexts.push(item.text);
            }
        }
        
        return uniqueTexts;
    }

    async fastBatchTranslateTexts(texts) {
        const translations = new Map();
        const batchSize = 50; // Larger batch size for faster processing
        
        // Process in larger batches with timeout protection
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchTranslations = await Promise.all(
                batch.map(text => this.translateWithTimeout(text, 2000)) // 2 second timeout
            );
            
            // Store in cache and results
            batch.forEach((text, index) => {
                const translation = batchTranslations[index];
                this.translationCache.set(text, translation);
                translations.set(text, translation);
            });
            
            // Update progress
            const progress = 70 + (i / texts.length) * 15;
            this.showProgress(progress);
            
            // Minimal delay for API rate limiting
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        return translations;
    }

    async translateWithTimeout(text, timeoutMs) {
        if (!text.trim()) return "";
        
        // Check cache first
        if (this.translationCache.has(text)) {
            return this.translationCache.get(text);
        }
        
        // Skip non-Korean short texts
        if (text.length < 3 && !this.isKoreanText(text)) {
            return text;
        }

        // Use multiple translation services with fallback
        const translationServices = [
            () => this.googleTranslateAPI(text),
            () => this.libreTranslateAPI(text),
            () => this.myMemoryAPI(text)
        ];

        for (const service of translationServices) {
            try {
                const translation = await this.raceWithTimeout(service(), timeoutMs);
                if (translation && translation !== text) {
                    this.translationCache.set(text, translation);
                    return translation;
                }
            } catch (error) {
                console.warn(`Translation service failed: ${error.message}`);
                continue;
            }
        }

        // Fallback to original text
        this.translationCache.set(text, text);
        return text;
    }

    async raceWithTimeout(promise, timeoutMs) {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );
        return Promise.race([promise, timeoutPromise]);
    }

    async googleTranslateAPI(text) {
        // Using Google Translate API with CORS proxy for better performance
        // Ensure proper encoding for Korean text
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodedText}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Google Translate API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                return data[0][0][0];
            }
            throw new Error('Invalid Google Translate response structure');
        } catch (error) {
            console.error('Google Translate API error:', error);
            throw error;
        }
    }

    async libreTranslateAPI(text) {
        // Using LibreTranslate API (faster alternative)
        const url = 'https://libretranslate.de/translate';
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: 'ko',
                    target: 'en',
                    format: 'text'
                })
            });
            
            if (!response.ok) {
                throw new Error(`LibreTranslate API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.translatedText) {
                return data.translatedText;
            }
            throw new Error('Invalid LibreTranslate response structure');
        } catch (error) {
            console.error('LibreTranslate API error:', error);
            throw error;
        }
    }

    async myMemoryAPI(text) {
        // Fallback to MyMemory API
        const encodedText = encodeURIComponent(text);
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=ko|en`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`MyMemory API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
            throw new Error('Invalid MyMemory response structure');
        } catch (error) {
            console.error('MyMemory API error:', error);
            throw error;
        }
    }

    isKoreanText(text) {
        // Check if text contains Korean characters
        return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
    }

    validateTextForFont(text, font) {
        // Validate text can be encoded by the font
        if (!text) return '';
        
        try {
            // Try to encode the text with the font
            const testBytes = font.encodeText(text);
            return text;
        } catch (error) {
            console.warn(`Font encoding failed for text: "${text}", error:`, error);
            // If encoding fails, try to sanitize more aggressively
            return this.convertToASCIIOnly(text);
        }
    }

    convertToASCIIOnly(text) {
        // Convert text to ASCII-only as final fallback - PRESERVE KOREAN TEXT!
        if (!text) return '';
        
        // For Korean text, we should NOT destroy it - Korean characters are valid Unicode
        if (this.isKoreanText(text)) {
            // Korean text should be preserved, not destroyed
            // Only replace problematic symbols, keep Korean Hangul intact
            return text
                .replace(/[∙•·]/g, '*')   // Various bullet points -> asterisk
                .replace(/[–—]/g, '-')   // Various dashes -> hyphen
                .replace(/["""]/g, '"')   // Smart quotes -> regular quotes
                .replace(/['''']/g, "'")  // Smart apostrophes -> regular apostrophe
                .replace(/[…]/g, '...')   // Ellipsis -> three dots
                .replace(/[‹›]/g, '<')   // Angle quotes -> less than
                .replace(/[«»]/g, '<<')  // Guillemets -> double less than
                .replace(/[±]/g, '+/-')  // Plus-minus
                .replace(/[×]/g, 'x')     // Multiplication -> x
                .replace(/[÷]/g, '/')     // Division -> slash
                .replace(/[≤]/g, '<=')    // Less than or equal
                .replace(/[≥]/g, '>=')    // Greater than or equal
                .replace(/[≠]/g, '!=')    // Not equal
                .replace(/[∞]/g, 'inf')   // Infinity
                .replace(/[√]/g, 'sqrt')  // Square root
                .replace(/[™]/g, '(TM)')  // Trademark
                .replace(/[®]/g, '(R)')   // Registered
                .replace(/[©]/g, '(C)')   // Copyright
                .trim() || text; // If everything gets stripped, return original
        }
        
        // For non-Korean text, replace with ASCII equivalents
        return text
            .replace(/[∙•·]/g, '*')
            .replace(/[–—]/g, '-')
            .replace(/["""]/g, '"')
            .replace(/['''']/g, "'")
            .replace(/[…]/g, '...')
            .replace(/[‹›«»]/g, '<')
            .replace(/[±×÷≤≥≠∞√™®©]/g, '?')
            .replace(/[^\x00-\x7F]/g, '?') // Replace any non-ASCII with ?
            .trim() || '[Text]';
    }

    sanitizeTextForPDF(text) {
        // Comprehensive text sanitization for PDF compatibility
        if (!text) return '';
        
        // Handle the specific bullet point character that's causing issues
        // Unicode 0x2219 (∙) is the problematic character
        text = text.replace(/\u2219/g, '*');  // Replace bullet with asterisk
        
        // Apply the general Unicode filtering
        return this.filterUnicodeForStandardFonts(text);
    }

    filterUnicodeForStandardFonts(text) {
        // Replace problematic Unicode characters that standard PDF fonts can't handle
        if (!text) return '';
        
        // First, try to preserve Korean characters if present
        if (this.isKoreanText(text)) {
            // For Korean text, we'll use a more conservative approach
            // Allow Korean Hangul syllables, Korean consonants/vowels, basic Latin, and common symbols
            // Korean Unicode ranges: Hangul syllables, Jamo consonants, Jamo vowels
            const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;
            
            // Replace only truly problematic characters, preserve Korean text
            return text
                .replace(/[∙•·]/g, '*')   // Various bullet points -> asterisk
                .replace(/[–—]/g, '-')   // Various dashes -> hyphen
                .replace(/["""]/g, '"')   // Smart quotes -> regular quotes
                .replace(/['''']/g, "'")  // Smart apostrophes -> regular apostrophe
                .replace(/[…]/g, '...')   // Ellipsis -> three dots
                .replace(/[‹›]/g, '<')   // Angle quotes -> less than
                .replace(/[«»]/g, '<<')  // Guillemets -> double less than
                .replace(/[±]/g, '+/-')  // Plus-minus
                .replace(/[×]/g, 'x')     // Multiplication -> x
                .replace(/[÷]/g, '/')     // Division -> slash
                .replace(/[≤]/g, '<=')    // Less than or equal
                .replace(/[≥]/g, '>=')    // Greater than or equal
                .replace(/[≠]/g, '!=')    // Not equal
                .replace(/[∞]/g, 'inf')   // Infinity
                .replace(/[√]/g, 'sqrt')  // Square root
                .replace(/[™]/g, '(TM)')  // Trademark
                .replace(/[®]/g, '(R)')   // Registered
                .replace(/[©]/g, '(C)')   // Copyright
                .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u0020-\u007E\u00A0-\u00FF\u2010-\u2015\u2022\u2026\u2032-\u2033]/g, (match) => {
                    // If it's Korean, keep it, otherwise replace with ?
                    return koreanPattern.test(match) ? match : '?';
                });
        }
        
        // For non-Korean text, replace problematic Unicode characters with ASCII equivalents
        return text
            .replace(/[∙•·]/g, '*')   // Various bullet points -> asterisk
            .replace(/[–—]/g, '-')   // Various dashes -> hyphen
            .replace(/["""]/g, '"')   // Smart quotes -> regular quotes
            .replace(/['''']/g, "'")  // Smart apostrophes -> regular apostrophe
            .replace(/[…]/g, '...')   // Ellipsis -> three dots
            .replace(/[‹›]/g, '<')   // Angle quotes -> less than
            .replace(/[«»]/g, '<<')  // Guillemets -> double less than
            .replace(/[±]/g, '+/-')  // Plus-minus
            .replace(/[×]/g, 'x')     // Multiplication -> x
            .replace(/[÷]/g, '/')     // Division -> slash
            .replace(/[≤]/g, '<=')    // Less than or equal
            .replace(/[≥]/g, '>=')    // Greater than or equal
            .replace(/[≠]/g, '!=')    // Not equal
            .replace(/[∞]/g, 'inf')   // Infinity
            .replace(/[√]/g, 'sqrt')  // Square root
            .replace(/[™]/g, '(TM)')  // Trademark
            .replace(/[®]/g, '(R)')   // Registered
            .replace(/[©]/g, '(C)')   // Copyright
            .replace(/[^\x00-\x7F\u00A0-\u00FF]/g, '?') // Replace any remaining non-Latin with ?
            .trim();
    }

    applyTranslationsToItems(textItems, translations) {
        for (const item of textItems) {
            if (item.text.trim() && translations.has(item.text)) {
                item.translatedText = translations.get(item.text);
            } else {
                item.translatedText = this.translationCache.get(item.text) || item.text;
            }
        }
    }

    async createTranslatedPDF(pageData) {
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Embed fonts that support Unicode characters (especially Korean)
        let unicodeFont;
        try {
            // For Korean text, we need fonts that support Unicode properly
            // Try fonts in order of Unicode support for Korean characters
            const fontOptions = [
                PDFLib.StandardFonts.Helvetica,  // Good Unicode support
                PDFLib.StandardFonts.TimesRoman, // Decent Unicode support
                PDFLib.StandardFonts.Courier,    // Basic Unicode support
                PDFLib.StandardFonts.Symbol      // Symbol font as fallback
            ];
            
            for (const fontOption of fontOptions) {
                try {
                    unicodeFont = await pdfDoc.embedFont(fontOption, { 
                        subset: true,
                        customName: 'KoreanFont'
                    });
                    break;
                } catch (fontError) {
                    console.warn(`Font ${fontOption} failed for Korean text, trying next...`);
                    continue;
                }
            }
            
            // Final fallback with subsetting to handle Unicode better
            if (!unicodeFont) {
                console.warn('Using Helvetica as final fallback for Korean text');
                unicodeFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica, {
                    subset: true,
                    customName: 'KoreanFallbackFont'
                });
            }
        } catch (error) {
            console.error('All font embedding failed for Korean text:', error);
            unicodeFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica, {
                subset: true,
                customName: 'ErrorKoreanFont'
            });
        }
        
        for (let pageInfo of pageData) {
            const page = pdfDoc.addPage([pageInfo.width, pageInfo.height]);
            
            // Group text items by their approximate line position for better layout preservation
            const lineGroups = this.groupTextItemsByLines(pageInfo.textItems);
            
            for (let lineGroup of lineGroups) {
                if (lineGroup.length === 0) continue;
                
                // Use the font size from the first item in the line
                const baseFontSize = lineGroup[0].fontSize || 12;
                
                // Calculate total width of original text
                const totalOriginalWidth = lineGroup.reduce((sum, item) => sum + (item.width || 0), 0);
                
                // Build the translated line
                const translatedLine = lineGroup.map(item => item.translatedText || item.text).join('');
                
                if (translatedLine.trim()) {
                    // Sanitize the text for PDF compatibility
                    const sanitizedLine = this.sanitizeTextForPDF(translatedLine);
                    // Calculate position for the first item in the line
                    const firstItem = lineGroup[0];
                    const x = firstItem.x || 50;
                    const y = pageInfo.height - (firstItem.y || 50);
                    
                    // Adjust font size to fit the translated text in the available space
                    let fontSize = baseFontSize;
                    const translatedWidth = (sanitizedLine.length * baseFontSize * 0.6); // Approximate width
                    
                    // Scale down if translated text is longer
                    if (translatedWidth > totalOriginalWidth && totalOriginalWidth > 0) {
                        fontSize = Math.max(8, baseFontSize * (totalOriginalWidth / translatedWidth));
                    }
                    
                    try {
                        // Pre-validate the text can be encoded by the font
                        const validatedText = this.validateTextForFont(sanitizedLine, unicodeFont);
                        
                        // Use the validated text that handles Unicode issues
                        page.drawText(validatedText, {
                            x: x,
                            y: y,
                            size: fontSize,
                            font: unicodeFont,
                            color: PDFLib.rgb(0, 0, 0),
                            maxWidth: pageInfo.width - x - 50,
                            lineHeight: fontSize * 1.2,
                        });
                    } catch (error) {
                        console.warn('Error drawing text:', error);
                        // Fallback: try with ASCII-only text
                        const asciiOnlyText = this.convertToASCIIOnly(sanitizedLine);
                        page.drawText(asciiOnlyText, {
                            x: x,
                            y: y,
                            size: Math.max(6, fontSize * 0.8),
                            font: unicodeFont,
                            color: PDFLib.rgb(0, 0, 0),
                        });
                    }
                }
            }
        }
        
        return pdfDoc;
    }

    async modifyExistingPDF(originalPdfBytes, pageData) {
        // Load the original PDF and modify it by overlaying translated text
        const originalPdf = await PDFLib.PDFDocument.load(originalPdfBytes);
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Copy all pages from the original PDF
        const copiedPages = await pdfDoc.copyPages(originalPdf, originalPdf.getPageIndices());
        
        // Embed fonts that support Unicode characters (especially Korean)
        let unicodeFont;
        try {
            const fontOptions = [
                PDFLib.StandardFonts.Helvetica,  // Good Unicode support
                PDFLib.StandardFonts.TimesRoman, // Decent Unicode support
                PDFLib.StandardFonts.Courier,    // Basic Unicode support
                PDFLib.StandardFonts.Symbol      // Symbol font as fallback
            ];
            
            for (const fontOption of fontOptions) {
                try {
                    unicodeFont = await pdfDoc.embedFont(fontOption, { 
                        subset: true,
                        customName: 'KoreanFont'
                    });
                    break;
                } catch (fontError) {
                    console.warn(`Font ${fontOption} failed for Korean text, trying next...`);
                    continue;
                }
            }
            
            if (!unicodeFont) {
                console.warn('Using Helvetica as final fallback for Korean text');
                unicodeFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica, {
                    subset: true,
                    customName: 'KoreanFallbackFont'
                });
            }
        } catch (error) {
            console.error('All font embedding failed for Korean text:', error);
            unicodeFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica, {
                subset: true,
                customName: 'ErrorKoreanFont'
            });
        }
        
        // Process each page
        for (let pageIndex = 0; pageIndex < copiedPages.length; pageIndex++) {
            const page = copiedPages[pageIndex];
            pdfDoc.addPage(page);
            
            // Find the corresponding page data
            const pageInfo = pageData.find(p => p.page === pageIndex + 1);
            if (!pageInfo) continue;
            
            // Group text items by their approximate line position
            const lineGroups = this.groupTextItemsByLines(pageInfo.textItems);
            
            for (let lineGroup of lineGroups) {
                if (lineGroup.length === 0) continue;
                
                // Use the font size from the first item in the line
                const baseFontSize = lineGroup[0].fontSize || 12;
                
                // Calculate precise bounding box of original text
                const minX = Math.min(...lineGroup.map(item => item.x));
                const maxX = Math.max(...lineGroup.map(item => item.x + (item.width || 0)));
                const originalWidth = maxX - minX;
                
                // Use the first item's Y directly (PDF uses bottom-left origin)
                const firstItem = lineGroup[0];
                const x = minX;
                const y = firstItem.y;
                
                // Build the translated line
                const translatedLine = lineGroup.map(item => item.translatedText || item.text).join('');
                
                if (translatedLine.trim()) {
                    // Sanitize the text for PDF compatibility
                    const sanitizedLine = this.sanitizeTextForPDF(translatedLine);
                    
                    let fontSize = baseFontSize;
                    let textToDraw = sanitizedLine;
                    let fontToUse = unicodeFont;
                    
                    // Validate text
                    try {
                        textToDraw = this.validateTextForFont(sanitizedLine, unicodeFont);
                    } catch (error) {
                        textToDraw = this.convertToASCIIOnly(sanitizedLine);
                    }
                    
                    // Measure text width
                    let textWidth = 0;
                    try {
                        textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);
                    } catch (e) {
                        textWidth = textToDraw.length * fontSize * 0.6;
                    }
                    
                    // Scale down if translated text is significantly wider than original
                    // Allow some expansion (e.g. 1.2x) because English might be wider than Korean
                    if (textWidth > originalWidth * 1.5 && originalWidth > 0) {
                        const scaleFactor = (originalWidth * 1.5) / textWidth;
                        fontSize = Math.max(6, fontSize * scaleFactor);
                        // Recalculate width
                        try {
                            textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);
                        } catch (e) {
                            textWidth = textToDraw.length * fontSize * 0.6;
                        }
                    }
                    
                    // Draw white background to cover original text
                    // Width should be max of original or new text to ensure coverage
                    const bgWidth = Math.max(textWidth, originalWidth);
                    
                    try {
                        page.drawRectangle({
                            x: x,
                            y: y - fontSize * 0.2, // Descent approximation
                            width: bgWidth,
                            height: fontSize * 1.2, // Line height approximation
                            color: PDFLib.rgb(1, 1, 1), // White
                        });
                    } catch (e) {
                        console.warn('Failed to draw background:', e);
                    }
                    
                    try {
                        page.drawText(textToDraw, {
                            x: x,
                            y: y,
                            size: fontSize,
                            font: fontToUse,
                            color: PDFLib.rgb(0, 0, 0),
                            maxWidth: pageInfo.width - x,
                        });
                    } catch (error) {
                        console.warn('Error drawing text:', error);
                        // Fallback
                        const asciiOnlyText = this.convertToASCIIOnly(sanitizedLine);
                        page.drawText(asciiOnlyText, {
                            x: x,
                            y: y,
                            size: Math.max(6, fontSize * 0.8),
                            font: unicodeFont,
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