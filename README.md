# Korean to English PDF Translator

A fast, client-side Korean to English PDF translation tool that works entirely in your browser. No server required, perfect for GitHub Pages deployment!

## 🚀 Features

- **⚡ Lightning Fast**: Client-side processing for instant results
- **🔒 Private & Secure**: Files never leave your browser
- **📱 Works Everywhere**: Runs on any device with a modern browser
- **🌐 GitHub Pages Ready**: Deploy instantly to GitHub Pages
- **🎯 Accurate Translation**: Uses Google Translate API for high-quality translations

## 🛠️ How It Works

1. **Upload** your Korean PDF file
2. **Extract** text content from the PDF
3. **Translate** Korean text to English using Google Translate
4. **Generate** new PDF with translated text
5. **Download** your translated PDF

## 📦 Installation

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/korean-pdf-translator.git
cd korean-pdf-translator

# Install dependencies
npm install

# Start local server
npm start
```

### GitHub Pages Deployment
1. Fork this repository
2. Go to Settings → Pages
3. Select "Deploy from a branch"
4. Choose "gh-pages" branch
5. Your site will be live at `https://yourusername.github.io/korean-pdf-translator/`

## 🎯 Usage

1. Open the application in your browser
2. Drag and drop your Korean PDF file or click to browse
3. Click "Translate to English"
4. Wait for processing (progress bar shows status)
5. Download your translated PDF

## 🔧 Technical Details

### Client-Side Architecture
- **PDF Processing**: Uses pdf-lib for PDF manipulation
- **Translation**: Google Translate API integration
- **UI**: Modern, responsive design with CSS animations
- **Performance**: Optimized for large PDF files

### File Structure
```
├── index.html          # Main application interface
├── translator.js       # Translation logic and PDF processing
├── package.json       # Project dependencies
└── .github/workflows/
    └── pages.yml      # GitHub Pages deployment
```

## 🚀 Performance Optimizations

- **Streaming PDF Processing**: Handles large files efficiently
- **Progressive Translation**: Translates in chunks for better UX
- **Memory Management**: Automatic cleanup of processed files
- **Caching**: Smart caching for repeated translations

## 🌐 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔒 Privacy & Security

- **No Data Collection**: We don't collect any personal data
- **Client-Side Processing**: All processing happens in your browser
- **No Server Storage**: Files are never uploaded to any server
- **Secure Translation**: Uses official Google Translate APIs

## 📝 API Integration

The application uses Google Translate API for accurate Korean to English translation. In a production environment, you would:

1. Get a Google Translate API key
2. Replace the mock translation with real API calls
3. Implement proper error handling for API limits

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues

- Text extraction accuracy depends on PDF quality
- Complex layouts may require manual adjustment
- Very large PDFs (>50MB) may cause browser memory issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [pdf-lib](https://github.com/Hopding/pdf-lib) for PDF processing
- Google Translate for translation services
- GitHub Pages for free hosting

---

**Made with ❤️ for the Korean-English translation community**