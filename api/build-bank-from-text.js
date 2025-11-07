// Build Question Bank from Past Papers (No OpenAI Required)
const fs = require('fs');
const path = require('path');

// Heuristic question extraction (no AI needed)
function extractQuestionsFromText(text) {
  const lines = text.split(/\r?\n/);
  const questions = [];
  let currentQuestion = [];
  
  const isQuestionStart = (line) => {
    return /^(\s*(Q\s*\d+|\(?\d{1,3}\)?[\).]))\s+/i.test(line);
  };
  
  const pushCurrentQuestion = () => {
    const fullText = currentQuestion.join(' ').replace(/\s+/g, ' ').trim();
    if (fullText.length > 15) {
      const marksMatch = /\((\d{1,3})\s*marks?\)/i.exec(fullText) || /(\d{1,3})\s*marks?/i.exec(fullText);
      const marks = marksMatch ? Math.min(20, Math.max(1, Number(marksMatch[1]) || 5)) : 5;
      questions.push({ text: fullText, marks });
    }
    currentQuestion = [];
  };
  
  for (const line of lines) {
    if (isQuestionStart(line) && currentQuestion.length > 0) {
      pushCurrentQuestion();
    }
    if (isQuestionStart(line)) {
      currentQuestion.push(line.replace(/^(\s*(Q\s*\d+|\(?\d{1,3}\)?[\).]))\s+/i, ''));
    } else {
      currentQuestion.push(line);
    }
  }
  
  if (currentQuestion.length > 0) {
    pushCurrentQuestion();
  }
  
  // Deduplicate
  const seen = new Set();
  const unique = questions.filter(q => {
    const key = q.text.slice(0, 300).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return unique;
}

// Sample questions for common syllabi
const sampleQuestions = {
  '9700': [ // Biology
    { text: 'Describe the structure and function of ribosomes in protein synthesis.', marks: 4 },
    { text: 'Explain the process of osmosis and its importance in plant cells.', marks: 6 },
    { text: 'Compare and contrast mitosis and meiosis.', marks: 8 },
    { text: 'What are enzymes and how do they affect reaction rates?', marks: 5 },
    { text: 'Describe the structure of DNA and explain how it relates to its function.', marks: 7 }
  ],
  '0478': [ // Computer Science
    { text: 'Explain the difference between RAM and ROM.', marks: 4 },
    { text: 'Write pseudocode for a program that finds the largest number in an array.', marks: 6 },
    { text: 'Describe the advantages and disadvantages of using a database management system.', marks: 8 },
    { text: 'What is an algorithm? Give an example of a sorting algorithm.', marks: 5 },
    { text: 'Explain how the CPU executes instructions using the fetch-decode-execute cycle.', marks: 7 }
  ],
  '0580': [ // Mathematics
    { text: 'Solve the equation: 3x + 7 = 22', marks: 3 },
    { text: 'Calculate the area of a circle with radius 5cm. (Use π = 3.14)', marks: 4 },
    { text: 'Find the value of x when 2^x = 64', marks: 3 },
    { text: 'A car travels 120km in 2 hours. Calculate its average speed.', marks: 2 },
    { text: 'Simplify: (2x^2 + 5x - 3) - (x^2 - 2x + 4)', marks: 4 }
  ]
};

function buildBank(syllabusCode, textFiles = []) {
  console.log(`\n=== Building Question Bank for ${syllabusCode} ===\n`);
  
  let allQuestions = [];
  
  // Extract from provided text files
  if (textFiles.length > 0) {
    console.log(`Processing ${textFiles.length} file(s)...`);
    
    for (const filePath of textFiles) {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }
      
      try {
        const text = fs.readFileSync(filePath, 'utf8');
        const extracted = extractQuestionsFromText(text);
        console.log(`✓ Extracted ${extracted.length} questions from ${path.basename(filePath)}`);
        allQuestions.push(...extracted);
      } catch (err) {
        console.log(`❌ Error reading ${filePath}: ${err.message}`);
      }
    }
  }
  
  // Add sample questions if no text files or extraction failed
  if (allQuestions.length === 0) {
    console.log('No questions extracted from files.');
    if (sampleQuestions[syllabusCode]) {
      console.log(`Using sample questions for ${syllabusCode}...`);
      allQuestions = [...sampleQuestions[syllabusCode]];
    } else {
      console.log('⚠️  No sample questions available for this syllabus.');
      console.log('Please provide text files with past papers or create questions manually.');
      return;
    }
  }
  
  // Deduplicate and save
  const bankDir = path.join(__dirname, 'data', 'papers');
  if (!fs.existsSync(bankDir)) {
    fs.mkdirSync(bankDir, { recursive: true });
  }
  
  const bankPath = path.join(bankDir, `${syllabusCode}.json`);
  
  // Merge with existing if present
  let existing = [];
  try {
    if (fs.existsSync(bankPath)) {
      const content = fs.readFileSync(bankPath, 'utf8');
      existing = JSON.parse(content);
      if (!Array.isArray(existing)) existing = [];
    }
  } catch {}
  
  const byKey = new Map();
  for (const q of existing) {
    const key = q.text?.slice(0, 300).toLowerCase();
    if (key) byKey.set(key, q);
  }
  for (const q of allQuestions) {
    const key = q.text.slice(0, 300).toLowerCase();
    if (!byKey.has(key)) byKey.set(key, q);
  }
  
  const merged = Array.from(byKey.values());
  
  fs.writeFileSync(bankPath, JSON.stringify(merged, null, 2), 'utf8');
  
  console.log(`\n✅ SUCCESS: Built bank with ${merged.length} questions`);
  console.log(`   Saved to: ${bankPath}`);
  console.log(`   New questions: ${allQuestions.length}`);
  console.log(`   Total in bank: ${merged.length}\n`);
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node build-bank-from-text.js <syllabusCode> [textFile1.txt] [textFile2.txt] ...');
    console.log('');
    console.log('Examples:');
    console.log('  node build-bank-from-text.js 9700');
    console.log('  node build-bank-from-text.js 0478 paper1.txt paper2.txt');
    console.log('');
    console.log('Available sample banks: 9700, 0478, 0580');
    console.log('');
    process.exit(0);
  }
  
  const [syllabusCode, ...files] = args;
  buildBank(syllabusCode, files);
}

module.exports = { buildBank, extractQuestionsFromText };
