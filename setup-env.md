# Environment Setup Guide

To run the HeartCheck app, you need to set up environment variables. Follow these steps:

## 1. Create Environment File

Create a `.env` file in the root directory of your project:

```bash
touch .env
```

## 2. Add Environment Variables

Copy the following content into your `.env` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe Configuration (for future use)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here

# App Configuration
EXPO_PUBLIC_APP_NAME=HeartCheck
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## 3. Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use an existing one
3. Go to Settings > API
4. Copy the Project URL and anon/public key
5. Replace the placeholder values in your `.env` file

## 4. Restart Development Server

After creating the `.env` file, restart your Expo development server:

```bash
npx expo start --clear
```

## Note

The app will work without these environment variables (it will show "not configured" messages), but you won't be able to use the authentication and database features.

For development purposes, you can leave the placeholder values and the app will run in demo mode.
