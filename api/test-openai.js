// Quick OpenAI Configuration Test Script
require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
  console.log('\n=== OpenAI Configuration Test ===\n');
  
  const apiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  console.log('✓ API Key present:', apiKey ? `Yes (${apiKey.substring(0, 7)}...)` : '❌ NO');
  console.log('✓ Model:', model);
  console.log('✓ Base URL:', baseURL);
  console.log('');
  
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    console.log('❌ ERROR: OPENAI_API_KEY is not configured in .env file\n');
    console.log('Please add your OpenAI API key to the .env file:');
    console.log('   OPENAI_API_KEY=sk-...\n');
    console.log('Get your key from: https://platform.openai.com/api-keys\n');
    process.exit(1);
  }
  
  console.log('Testing API connection...\n');
  
  try {
    const client = new OpenAI({ apiKey, baseURL, timeout: 10000 });
    
    const response = await client.chat.completions.create({
      model,
      max_tokens: 10,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with: PONG' },
        { role: 'user', content: 'Ping' }
      ]
    });
    
    const content = response.choices?.[0]?.message?.content || '';
    console.log('✅ SUCCESS: OpenAI API is working!');
    console.log('   Response:', content);
    console.log('\n✓ Your configuration is correct. You can now generate AI questions.\n');
    
  } catch (error) {
    console.log('❌ FAILED: Could not connect to OpenAI API\n');
    console.log('Error:', error.message);
    
    if (error.status === 401) {
      console.log('\n⚠️  Your API key is invalid or expired.');
      console.log('   Please check your OPENAI_API_KEY in .env\n');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n⚠️  Cannot reach OpenAI servers. Check your internet connection.\n');
    } else if (error.status === 429) {
      console.log('\n⚠️  Rate limit exceeded or quota reached.\n');
    }
    
    process.exit(1);
  }
}

testOpenAI().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
