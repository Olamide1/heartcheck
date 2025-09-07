// Simple Stripe Checkout - no initialization needed
export const initializeStripe = async () => {
  console.log('✅ Stripe Checkout ready');
  return true;
};

// Real Stripe payment processing
export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Create Stripe Checkout session using direct API call
   * Note: This is for testing only - in production, use server-side code
   */
  async createCheckoutSession(amount: number, plan: 'monthly' | 'annual', userId?: string): Promise<{ url: string }> {
    try {
      console.log(`Creating checkout session for $${amount} ${plan} plan`);
      
      // First, let's test if our API key works by checking account balance
      console.log('Testing Stripe API key...');
      const testResponse = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
        },
      });
      
      if (!testResponse.ok) {
        const testError = await testResponse.text();
        throw new Error(`Stripe API key test failed: ${testResponse.status} ${testError}`);
      }
      
      console.log('✅ Stripe API key is working');
      
      // Your Stripe price IDs (use environment variables for production)
      const priceIds = {
        monthly: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_1S4ghpL4pn7XXHF53GbOdJ1t',
        annual: process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID || 'price_1S4gjWL4pn7XXHF5xKU0HfaP'
      }

      const priceId = priceIds[plan];
      
      if (!priceId) {
        throw new Error(`Invalid plan: ${plan}`)
      }

      // Create Stripe checkout session using REST API with manual form data
      const formDataString = [
        `line_items[0][price]=${encodeURIComponent(priceId)}`,
        `line_items[0][quantity]=1`,
        `mode=subscription`,
        `success_url=${encodeURIComponent(`https://playful-blancmange-bf370c.netlify.app/payment-success?plan=${plan}&user_id=${userId || ''}`)}`,
        `cancel_url=${encodeURIComponent('https://playful-blancmange-bf370c.netlify.app/payment-cancel')}`,
        `metadata[plan]=${encodeURIComponent(plan)}`,
        `metadata[service]=${encodeURIComponent('heartcheck_coaching')}`
      ].join('&');
      
      console.log('Stripe request body:', formDataString);
      console.log('Success URL being sent:', `https://playful-blancmange-bf370c.netlify.app/payment-success?plan=${plan}&user_id=${userId || ''}`);
      
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataString,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Stripe API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      console.log('Checkout session created:', data.url);
      
      return { url: data.url };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Process subscription payment
   * This will be called after successful payment
   */
  async processSubscriptionPayment(
    userId: string,
    plan: 'monthly' | 'annual',
    paymentIntentId: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      console.log(`Processing ${plan} subscription payment for user ${userId}`);
      
      // In a real app, you'd:
      // 1. Verify the payment intent with Stripe
      // 2. Create a subscription in Stripe
      // 3. Update your database
      
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const subscriptionId = `sub_${userId}_${Date.now()}`;
      
      return {
        success: true,
        subscriptionId,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Get pricing for plans
   */
  getPricing() {
    return {
      monthly: { price: 6.99, priceId: 'price_monthly_699' },
      annual: { price: 59.99, priceId: 'price_annual_5999' },
    };
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
