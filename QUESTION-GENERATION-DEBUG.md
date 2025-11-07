# Question Generation Troubleshooting Guide

## Problem
"No questions available for the selected syllabus. Ensure OpenAI is configured or upload past papers to build the bank."

## Root Causes Identified

### 1. All Question Banks Are Empty
- Location: `api/data/papers/*.json`
- Status: 31 bank files exist but all contain `[]` (empty)
- Available codes: 0407, 0444, 0445, 0450, 0452, 0455, 0460, 0478, 0490, 0500, 0580, 0610, 0620, 0625, 2210, 9484, 9489, 9609, 9618, 9626, 9695, 9696, 9699, 9700, 9701, 9702, 9705, 9706, 9708, CS-0478, MATH-JHS-01

### 2. OpenAI Not Configured
- The system needs OpenAI API to auto-generate questions when banks are empty

---

## Solution Steps

### Step 1: Configure OpenAI API Key

1. **Get an OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Edit `api/.env` file**
   ```env
   OPENAI_API_KEY=sk-your-actual-key-here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_TIMEOUT_MS=60000
   ```

3. **Test the configuration**
   ```bash
   cd api
   node test-openai.js
   ```
   
   Expected output:
   ```
   ✅ SUCCESS: OpenAI API is working!
   ```

4. **Restart the API server**
   ```bash
   # Stop the current server (Ctrl+C if running)
   npm run start:dev
   ```

### Step 2: Verify Configuration via API

```bash
# Check OpenAI config
curl http://localhost:3000/api/elearning/ai/check-config

# Should return:
{
  "ok": true,
  "hasKey": true,
  "model": "gpt-4o-mini",
  "baseURL": "https://api.openai.com/v1"
}

# Test OpenAI connection
curl http://localhost:3000/api/elearning/ai/self-test

# Should return:
{
  "ok": true,
  "content": "PONG"
}
```

### Step 3: Generate Questions

Now when you click "Generate AI Questions" in the web UI:
1. Select a class
2. Select a subject code (e.g., 9700, 0478, etc.)
3. Click "Generate AI Questions"

**What happens:**
- System detects the bank is empty
- Calls OpenAI to generate questions based on syllabus code
- Saves questions to `api/data/papers/<code>.json`
- Creates a test file in resources

---

## Alternative: Upload Past Papers (No OpenAI Required)

If you don't want to use OpenAI, you can build banks from past exam papers:

### Option A: Via File System

1. **Create folder structure**
   ```
   api/uploads/bank-input/9700/
   ```

2. **Add past papers**
   - Place PDF, DOCX, or TXT files in the folder
   - Files should contain exam questions

3. **Enable OCR (if PDFs are scanned images)**
   ```env
   ENABLE_OCR=true
   OCR_LANG=eng
   ```

4. **Build the bank via API**
   ```bash
   curl -X POST http://localhost:3000/api/elearning/ai/build-bank \
     -F "syllabusCode=9700" \
     -F "heuristicOnly=true" \
     -F "files[]=@path/to/paper1.pdf"
   ```

### Option B: Via Web UI (Teacher/Admin)

Currently, the build-bank endpoint exists but isn't exposed in the UI. You can add a UI for it or use the API directly.

---

## Common Errors

### Error: "OPENAI_API_KEY not configured"
- Add the key to `api/.env`
- Restart the API server

### Error: "Invalid API key"
- Check your key at https://platform.openai.com/api-keys
- Ensure it starts with `sk-`
- Verify it's not expired

### Error: "Rate limit exceeded"
- You've exceeded your OpenAI API quota
- Check usage: https://platform.openai.com/usage
- Upgrade your plan or wait for quota reset

### Error: "Bank not found for code: XXX"
- The syllabus code doesn't match any bank file
- Available codes listed above
- Create a new bank by uploading papers

### Error: "No text extracted and OpenAI not configured"
- Uploaded PDFs are scanned images
- Enable OCR: `ENABLE_OCR=true` in `.env`
- Or provide text-based PDFs

---

## Quick Test Commands

```bash
# 1. Test OpenAI configuration
cd api
node test-openai.js

# 2. Check if API server is running
curl http://localhost:3000/api/health || curl http://localhost:3000/

# 3. Check OpenAI config endpoint
curl http://localhost:3000/api/elearning/ai/check-config

# 4. Self-test OpenAI
curl http://localhost:3000/api/elearning/ai/self-test

# 5. Generate a test (replace values)
curl -X POST http://localhost:3000/api/elearning/ai/generate-test \
  -H "Content-Type: application/json" \
  -d '{"subject":"Biology","classRef":"Form4","syllabusCode":"9700","total":75}'
```

---

## Files to Check

1. **`.env`** - OpenAI configuration
2. **`data/papers/*.json`** - Question banks (currently empty)
3. **`uploads/bank-input/`** - Past papers for building banks
4. **Console/Terminal** - API server logs for detailed errors

---

## Next Steps After Configuration

1. ✅ Configure OpenAI API key in `.env`
2. ✅ Run `node test-openai.js` to verify
3. ✅ Restart API server
4. ✅ Try generating questions via web UI
5. 📝 Monitor API logs for any errors
6. 📝 Check generated files in `data/papers/` and `uploads/resources/`

---

## Support

If issues persist:
1. Check API server console logs
2. Check browser console (F12) for errors
3. Verify all environment variables are set
4. Ensure API server is running on port 3000
5. Test the endpoints manually using curl
