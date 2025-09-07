# Stripe Environment Setup

## Add Stripe Secret Key to Supabase

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `gnnklejmyokfgoajrlml`

2. **Add Environment Variable**
   - Go to Settings → Edge Functions
   - Add a new secret: `STRIPE_SECRET_KEY`
   - Value: `sk_test_your_stripe_secret_key_here`

3. **Deploy the Edge Function**
   - Run: `supabase functions deploy create-checkout-session`
   - Or use the Supabase CLI if you have it installed

## Test the Integration

Once the environment variable is set and the function is deployed, the payment flow should work:

1. User clicks "Upgrade Now"
2. App calls the Edge Function
3. Edge Function creates Stripe checkout session using your product IDs
4. User is redirected to Stripe checkout
5. After payment, user returns to app

## Product IDs Used

- **Monthly**: `prod_your_monthly_product_id`
- **Annual**: `prod_your_annual_product_id`

These are already configured in the Edge Function code.
