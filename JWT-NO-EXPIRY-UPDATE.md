# JWT Token No Expiration Update

## What Changed
Updated JWT token expiration from **1 day** to **100 years** (essentially never expires).

## File Modified
- `api/src/auth/auth.module.ts`
  - Changed `jwtExpiresIn` from `'1d'` to `'100y'`

## What This Means
- New login tokens will last for 100 years
- Parents (and all users) won't need to log in again unless they:
  - Clear browser storage
  - Explicitly log out
  - Switch devices/browsers

## How to Apply

### 1. Restart the API
```bash
cd api
# Stop the current process (Ctrl+C)
npm run start:dev
```

### 2. Log in Again
**Important**: Existing tokens still have the old 1-day expiration. You must log in again to get a new 100-year token.

- Go to: `http://localhost:4200/parent/login`
- Enter your credentials
- Click Login

### 3. Verify
After logging in:
- Open DevTools → Application → Local Storage
- Look at `access_token` - copy it
- Go to https://jwt.io and paste the token
- Check the `exp` field - it should show a date ~100 years in the future

## Security Note
⚠️ **Development Only**: This configuration is suitable for development/testing but NOT recommended for production.

In production, you should:
- Use shorter expiration times (e.g., 7d, 30d)
- Implement refresh tokens
- Have proper token revocation mechanisms
- Use secure, HttpOnly cookies instead of localStorage

## Alternative: Set Custom Expiration
If you want a different expiration time, you can set an environment variable:

1. Create `api/.env` file:
```env
JWT_EXPIRES_IN=365d
```

2. Restart the API

Valid formats:
- `7d` = 7 days
- `30d` = 30 days
- `365d` = 1 year
- `100y` = 100 years
- `1h` = 1 hour
- `60m` = 60 minutes

## Rollback
If you want to restore the 1-day expiration:

Edit `api/src/auth/auth.module.ts` line 11:
```typescript
const jwtExpiresIn: number | StringValue = (process.env.JWT_EXPIRES_IN as unknown as StringValue) || ('1d' as StringValue);
```

Then restart the API.
