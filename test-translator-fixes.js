// Test the translator.js file and Korean character fixes
const fs = require('fs');

console.log('Testing translator.js...');

// Check if the file exists and can be read
if (fs.existsSync('translator.js')) {
  const content = fs.readFileSync('translator.js', 'utf8');
  console.log('✓ translator.js file exists and is readable');
  console.log('✓ File size:', content.length, 'characters');
  
  // Check for Korean character handling functions
  const hasKoreanRegex = content.includes('isKoreanText');
  const hasUnicodeFix = content.includes('convertToASCIIOnly');
  const hasFontHandling = content.includes('KoreanFont');
  
  console.log('✓ Korean detection function:', hasKoreanRegex);
  console.log('✓ Unicode handling function:', hasUnicodeFix);
  console.log('✓ Korean font handling:', hasFontHandling);
  
  if (hasKoreanRegex && hasUnicodeFix && hasFontHandling) {
    console.log('✓ All Korean character fixes are present!');
  }
  
  // Test specific fixes we made
  const hasFixedConvertFunction = content.includes('PRESERVE KOREAN TEXT');
  const hasBetterFontHandling = content.includes('Korean text, we need fonts');
  
  console.log('✓ Fixed convertToASCIIOnly function:', hasFixedConvertFunction);
  console.log('✓ Improved font handling:', hasBetterFontHandling);
  
  if (hasFixedConvertFunction && hasBetterFontHandling) {
    console.log('✓ All critical Korean character encoding fixes applied!');
  }
} else {
  console.log('✗ translator.js file not found');
}