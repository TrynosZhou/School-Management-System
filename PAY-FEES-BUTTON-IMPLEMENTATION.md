# Pay Fees Button Implementation

## Overview
Added a "Pay Fees" button on the my-fees page that redirects users to the record-payment page with automatic student ID pre-filling and balance lookup.

## Changes Made

### 1. My Fees Page (`web/src/app/accounts/my-fees.component.ts`)

#### Added "Pay Fees" Button
- **Location**: Actions section (line 39)
- **Icon**: Credit card SVG icon
- **Position**: First button before "Download Statement" and "Print"

#### Button Styling
- **Background**: Blue (`#0b53a5`)
- **Text**: White, bold (`font-weight: 700`)
- **Hover**: Darker blue (`#073d7a`)
- **Consistent** with all other buttons on the page

#### Navigation Logic (`payFees()` method)
```typescript
payFees() {
  const d = this.data();
  if (!d || !d.student?.code) {
    alert('Please check a student balance first');
    return;
  }
  // Navigate to record-payment page with student code as query parameter
  this.router.navigate(['/accounts/record-payment'], {
    queryParams: { student: d.student.code }
  });
}
```

**Features**:
- Validates that balance has been checked before navigation
- Passes student code via query parameter
- Shows alert if user tries to pay without checking balance first

### 2. Record Payment Page (`web/src/app/accounts/accounts-admin.component.ts`)

#### Auto-Fill Enhancement
```typescript
// Prefill student from query param when coming from Students list or my-fees page
const studentQP = this.route.snapshot.queryParamMap.get('student');
if (studentQP) {
  this.pay.student = studentQP;
  // Auto-lookup balance when student is pre-filled
  setTimeout(() => this.lookupBalance(), 100);
}
```

**Features**:
- Accepts `student` query parameter
- Auto-fills the Student ID field
- Automatically triggers balance lookup
- Displays student name and current balance

## User Flow

### Step 1: Check Balance
1. User goes to "My Fees" page (`/accounts/my-fees`)
2. Enters Student ID (e.g., `JHS0000123`)
3. Clicks "Check Balance"
4. System displays:
   - Student name
   - Student code
   - Current balance
   - Invoices list
   - Transactions list

### Step 2: Pay Fees
1. User clicks **"Pay Fees"** button
2. System navigates to `/accounts/record-payment?student=JHS0000123`
3. Record Payment page automatically:
   - Pre-fills Student ID field
   - Triggers balance lookup
   - Displays student name and current balance

### Step 3: Record Payment
1. User enters payment details:
   - Amount
   - Payment method (cash, momo, bank, cheque, card)
   - Receipt number (auto-generated)
   - Reference/transaction ID
   - Date of transaction
   - Term and Academic Year (auto-filled from settings)
   - Optional note
2. Clicks "Record Payment"
3. System saves payment and displays new balance

## Button Specifications

### Visual Design
- **Style**: Solid blue button with white text
- **Font**: Bold (700 weight)
- **Icon**: Credit card SVG
- **Border**: None
- **Border Radius**: 8px
- **Padding**: 8px 16px
- **Hover Effect**: Background darkens to `#073d7a`
- **Cursor**: Pointer

### Responsive Behavior
- Maintains full button layout on desktop
- Actions stack vertically on mobile (< 860px)

## Technical Details

### Query Parameter
- **Key**: `student`
- **Value**: Student code (e.g., `JHS0000123`)
- **Format**: `/accounts/record-payment?student=<code>`

### Auto-Lookup Timing
- Delay: 100ms after page load
- Ensures component is fully initialized
- Triggers `lookupBalance()` method

### Error Handling
- Shows alert if user clicks "Pay Fees" without checking balance first
- Prevents navigation without valid student data
- Displays lookup errors in record-payment page

## Files Modified

1. **`web/src/app/accounts/my-fees.component.ts`**
   - Added "Pay Fees" button in template
   - Added `payFees()` navigation method
   - Updated button styling to blue/white theme

2. **`web/src/app/accounts/accounts-admin.component.ts`**
   - Enhanced query parameter handling
   - Added auto-lookup trigger for pre-filled student

## Testing Checklist

- [ ] "Pay Fees" button appears on my-fees page
- [ ] Button is styled with blue background and white bold text
- [ ] Clicking button without checking balance shows alert
- [ ] Clicking button after checking balance navigates to record-payment
- [ ] Student ID is pre-filled on record-payment page
- [ ] Balance lookup automatically triggers
- [ ] Student name and balance display correctly
- [ ] Payment can be recorded successfully
- [ ] New balance updates after payment

## Benefits

1. **Streamlined Workflow**: Users can check balance and pay in 2 clicks
2. **No Re-entry**: Student ID carries over automatically
3. **Reduced Errors**: No manual typing of student ID on payment page
4. **Better UX**: Clear call-to-action button for payments
5. **Consistent Design**: All buttons follow same blue/white theme

## Future Enhancements

- Add payment amount suggestion based on outstanding balance
- Show payment history on confirmation
- Email receipt to parent after payment
- Support partial payments with balance calculation
- Add payment plan options
