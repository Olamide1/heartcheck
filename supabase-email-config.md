# Fix Supabase Email Confirmation Redirect Issue

## 🚨 **The Problem**
Your email confirmation links are redirecting to `localhost:3000` which doesn't exist, making it impossible to complete the confirmation process.

## 🔧 **Solution 1: Update Supabase Site URL (Recommended)**

### Step 1: Go to Supabase Dashboard
1. Open [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your HeartCheck project

### Step 2: Update Authentication Settings
1. Go to **Authentication** → **URL Configuration**
2. Update these fields:

**Site URL:**
```
https://your-app-domain.com
```
*For development, you can use:*
```
exp://192.168.1.135:8081
```
*Or your Expo Go URL*

**Redirect URLs:**
```
https://your-app-domain.com/auth/callback
exp://192.168.1.135:8081/auth/callback
heartcheck://auth/callback
```

### Step 3: Save Changes
Click **Save** to apply the new configuration.

## 🔧 **Solution 2: Use Deep Links (Better for Mobile)**

### Step 1: Update Your App Configuration
The app.json has been updated with:
- `"scheme": "heartcheck"` - Creates deep link support
- Proper bundle identifiers for iOS/Android

### Step 2: Test Deep Links
After updating Supabase, test with:
```
heartcheck://auth/callback
```

## 🔧 **Solution 3: Manual Confirmation (Quick Test)**

### Option A: Disable Email Confirmation Temporarily
Run this in Supabase SQL Editor:
```sql
-- Temporarily disable email confirmation for testing
UPDATE auth.config SET enable_confirmations = false;
```

### Option B: Confirm User Manually
Run this in Supabase SQL Editor:
```sql
-- Manually confirm a user (replace with actual user ID)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'theolaakomolafe@gmail.com';
```

## 📱 **How to Test**

1. **Update Supabase configuration** (Solution 1)
2. **Try signing up again**
3. **Check email** - should redirect to your app, not localhost
4. **Complete confirmation** in the app
5. **Profile should be created** successfully

## 🎯 **Recommended Approach**

1. **Use Solution 1** (Update Supabase Site URL)
2. **Keep email confirmation enabled** (better security)
3. **Test the flow** with proper redirects
4. **Remove manual confirmation** once working

## 🚀 **After Fixing**

The email confirmation flow should work like this:
1. User signs up → Email sent
2. User clicks email link → Redirects to your app
3. User confirms → Profile created
4. User continues to partner pairing

Let me know which solution you'd like to try first!
