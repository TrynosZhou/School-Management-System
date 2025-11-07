# Fix Invoice Status for Student TXS9743842

## Steps to Reconcile Invoices

### 1. Restart Backend Server
The new code needs to be loaded first.

```bash
cd C:\Users\DELL\Desktop\schoolPro\api
npm run start:dev
```

Wait until you see:
```
Nest application successfully started
```

### 2. Get Admin Auth Token
You need an admin authorization token. 

**Option A: From Browser**
- Open browser Dev Tools (F12)
- Go to Application/Storage → Local Storage
- Find key: `access_token`
- Copy the value

**Option B: Login via API**
```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"YOUR_PASSWORD\"}"
```
Copy the `access_token` from response.

### 3. Call Reconcile Endpoint

**Option A: Using Browser/Postman (Easiest)**
- Method: `POST`
- URL: `http://localhost:3000/api/accounts/reconcile/TXS9743842`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body (JSON):
  ```json
  {
    "term": "Term 1"
  }
  ```

**Option B: Using curl**
```bash
curl -X POST http://localhost:3000/api/accounts/reconcile/TXS9743842 ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -d "{\"term\": \"Term 1\"}"
```

**Option C: Using test script**
1. Edit `test-reconcile.js` and add your token to line 17:
   ```javascript
   'Authorization': 'Bearer YOUR_TOKEN_HERE'
   ```
2. Run:
   ```bash
   node test-reconcile.js
   ```

### 4. Check Backend Logs

You should see:
```
[Reconcile] Student e39aac04-bf0c-43f6-91e7-791d93974e6b, Balance: 0, Unpaid invoices total: 2450
[Reconcile] Marked invoice xxx (Desk fee, 500) as PAID
[Reconcile] Marked invoice yyy (Term 1 fees, 1950) as PAID
[Reconcile] ✅ Marked 2 invoices as PAID (balance is 0)
```

Expected Response:
```json
{
  "success": true,
  "settled": 2,
  "message": "Settled 2 invoices"
}
```

### 5. Verify Fix

**Check Invoice Page:**
- Refresh the parent portal invoice page
- Both invoices should now show status: `paid`

**Test Report Card Access:**
- Click "Open Report" button
- Should now succeed (no 403 error)
- Backend logs should show:
  ```
  [DEBUG] ✅ Balance check passed: 0
  [DEBUG] ✅ Access GRANTED
  ```

## Troubleshooting

### 401 Unauthorized
- Token expired or missing
- Get a fresh token (step 2)

### 404 Not Found
- Backend not running or endpoint path wrong
- Verify backend is at http://localhost:3000

### 403 Forbidden
- Not logged in as admin
- Use admin credentials

### "No unpaid invoices"
- Invoices already fixed
- Check invoice page to confirm they show "paid"

## Alternative: Fix via Admin UI

If API call doesn't work, manually reconcile via database:
```sql
UPDATE fee_invoice 
SET status = 'paid' 
WHERE student_id = 'e39aac04-bf0c-43f6-91e7-791d93974e6b' 
  AND term = 'Term 1' 
  AND status = 'unpaid';
```
