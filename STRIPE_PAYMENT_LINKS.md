# Stripe Payment Links Setup

This is the simplest way to integrate Stripe payments without any server-side code.

## Steps to Set Up

1. **Go to your Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/payment-links
   - Make sure you're in Test mode (toggle in top right)

2. **Create Payment Links**
   - Click "Create payment link"
   - Create two products:
     - **Monthly Plan**: $6.99/month
     - **Annual Plan**: $49.99/year (or whatever your pricing is)

3. **Get the Payment Link URLs**
   - Copy the payment link URLs (they look like: `https://buy.stripe.com/test_xxxxxxxxx`)
   - Replace the URLs in `src/services/payments.ts`:
     ```typescript
     const stripePaymentLinks = {
       monthly: 'https://buy.stripe.com/test_YOUR_MONTHLY_LINK_HERE',
       annual: 'https://buy.stripe.com/test_YOUR_ANNUAL_LINK_HERE',
     };
     ```

4. **Test the Integration**
   - The app will now redirect to Stripe's hosted checkout
   - Users can complete payment and return to your app

## Benefits of This Approach

- ✅ No server-side code needed
- ✅ No API keys in client code
- ✅ Stripe handles all security
- ✅ Works with Apple App Store (as external service)
- ✅ Easy to set up and maintain

## Next Steps

1. Create the payment links in Stripe
2. Update the URLs in the code
3. Test the payment flow
4. Set up webhooks if you need to track successful payments
