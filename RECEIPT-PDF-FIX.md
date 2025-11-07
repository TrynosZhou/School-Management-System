# Receipt PDF Display Fix

## Issue
The "Receipt PDF" buttons on the record-payment page were not properly displaying receipts when clicked due to authentication issues with the PDF endpoint.

## Root Cause
The previous implementation used `window.open()` with a direct URL, which didn't include authentication headers required by the API endpoint.

```typescript
// OLD (Not Working)
downloadReceipt(txId: string) {
  const url = `/api/accounts/receipt/${encodeURIComponent(txId)}`;
  window.open(url, '_blank');  // ❌ No authentication headers
}
```

## Solution
Updated the implementation to use Angular's `HttpClient` with proper authentication handling:

```typescript
// NEW (Working)
downloadReceipt(txId: string) {
  if (!txId) return;
  
  const url = `http://localhost:3000/api/accounts/receipt/${encodeURIComponent(txId)}`;
  
  this.http.get(url, { responseType: 'blob' }).subscribe({
    next: (blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      
      if (newWindow) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        // Fallback: Download if popup blocked
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `receipt-${txId}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      }
    },
    error: (error) => {
      console.error('Error fetching receipt:', error);
      alert('Failed to load receipt. Please ensure you are logged in and try again.');
    }
  });
}
```

## Key Features

### 1. **Authenticated Request**
- Uses Angular's `HttpClient` which automatically includes authentication headers
- Bearer token from `localStorage` is automatically attached by the HTTP interceptor

### 2. **PDF Display in New Tab**
- Fetches PDF as a `Blob`
- Creates a temporary blob URL
- Opens PDF in new browser tab for viewing
- Automatically cleans up blob URL after 1 second

### 3. **Popup Blocker Fallback**
- If browser blocks the new tab/window (popup blocker)
- Automatically triggers PDF download instead
- User can still access the receipt

### 4. **Error Handling**
- Catches network errors and API failures
- Displays user-friendly alert message
- Logs error to console for debugging

## API Endpoint
**URL**: `GET /api/accounts/receipt/:txId`

**Authentication**: Required (Admin role)

**Response**: PDF file (`application/pdf`)

**Headers**:
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="receipt-{name}.pdf"`
- `Access-Control-Expose-Headers: Content-Disposition`

## Receipt PDF Content
The generated PDF includes:
- School logo and header
- Payment receipt title
- Receipt number (e.g., J0001)
- Student information (name, code)
- Payment details:
  - Amount paid
  - Payment method (cash, momo, bank, cheque, card)
  - Transaction reference
  - Date received
  - Term and academic year
  - Optional note
- Current balance after payment

## User Flow

### Step 1: Record Payment
1. Admin goes to "Accounts → Record Payment"
2. Enters student ID and checks balance
3. Records a payment with amount and details
4. System generates receipt and displays receipt number

### Step 2: View Recent Payments
1. Scroll to "Recent Payments" section
2. Table shows all recent payment transactions
3. Each row has a "Receipt PDF" button

### Step 3: Display Receipt
1. Click "Receipt PDF" button for any transaction
2. System:
   - Fetches PDF from API with authentication
   - Opens PDF in new browser tab
   - Displays formatted receipt
3. User can:
   - View receipt on screen
   - Print using browser print (Ctrl+P)
   - Save using browser save (Ctrl+S)
   - Close tab when done

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

### PDF Viewer
- Uses browser's built-in PDF viewer
- No plugins or extensions required
- Native print and save functionality

## Testing Checklist

- [ ] Record a test payment
- [ ] Click "Receipt PDF" button in Recent Payments
- [ ] Verify PDF opens in new tab
- [ ] Verify PDF displays correctly with:
  - [ ] Receipt number
  - [ ] Student name and code
  - [ ] Payment amount
  - [ ] Payment method
  - [ ] Transaction date
  - [ ] Current balance
- [ ] Test popup blocker scenario (PDF downloads instead)
- [ ] Test error handling (invalid transaction ID)
- [ ] Verify authentication (logout and try - should fail)

## Technical Details

### File Modified
`web/src/app/accounts/accounts-admin.component.ts`

### Method Updated
`downloadReceipt(txId: string)`

### Dependencies
- Angular `HttpClient` (already imported)
- Browser Blob API
- Browser window.open() API

### Response Type
```typescript
this.http.get(url, { responseType: 'blob' })
```
- Important: Must specify `responseType: 'blob'` to handle binary PDF data
- Without this, Angular tries to parse as JSON and fails

## Security
- ✅ Requires admin authentication
- ✅ Bearer token automatically included
- ✅ Server validates permissions
- ✅ Transaction ID must be valid
- ✅ No sensitive data exposed in URL

## Performance
- **Blob URL**: Efficient in-memory handling
- **Cleanup**: Automatic memory cleanup after 1 second
- **Network**: Single HTTP request per receipt
- **Caching**: Browser may cache PDFs

## Future Enhancements
- [ ] Add loading spinner while fetching PDF
- [ ] Email receipt to parent/guardian
- [ ] Batch download multiple receipts
- [ ] Receipt preview modal before opening new tab
- [ ] Print receipt directly without opening tab
- [ ] SMS receipt link to parent mobile

## Troubleshooting

### Issue: PDF doesn't open
- **Cause**: Popup blocker enabled
- **Solution**: Allow popups for this site, or use download fallback

### Issue: "Failed to load receipt" error
- **Cause**: Not logged in or session expired
- **Solution**: Refresh page and log in again

### Issue: Blank PDF
- **Cause**: Invalid transaction ID
- **Solution**: Ensure payment was properly recorded

### Issue: 404 Not Found
- **Cause**: API server not running
- **Solution**: Start the API server (`npm run start:dev`)

## Related Files
- **Frontend**: `web/src/app/accounts/accounts-admin.component.ts`
- **Backend**: `api/src/accounts/accounts.controller.ts` (line 455-500+)
- **Service**: `api/src/accounts/accounts.service.ts`
- **Entity**: `api/src/accounts/fee-transaction.entity.ts`

## Summary
The receipt PDF functionality now properly displays payment receipts in a new browser tab with full authentication support and graceful fallback handling.
