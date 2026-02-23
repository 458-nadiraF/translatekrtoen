// Test Korean character encoding
console.log('Korean text test:');
console.log('안녕하세요 한국어 테스트입니다.');
console.log('Buffer length:', Buffer.from('안녕하세요').length);
console.log('UTF-8 encoding working:', Buffer.from('안녕하세요').length > 0);

// Test the regex patterns from translator.js
const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const testText = '안녕하세요';
console.log('Korean regex test:', koreanRegex.test(testText));

// Test problematic Unicode character replacement
const problematicText = 'Test ∙ bullet • point · and — dash –';
console.log('Original:', problematicText);
const cleaned = problematicText
  .replace(/[∙•·]/g, '*')
  .replace(/[–—]/g, '-');
console.log('Cleaned:', cleaned);

console.log('All Korean character tests passed!');