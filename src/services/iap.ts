import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

// Product IDs from App Store Connect
export const IAP_PRODUCT_IDS = {
  monthly: 'hc_premium_monthly',
  yearly: 'hc_premium_yearly',
};

class IapService {
  private purchaseUpdateSub: any = null;
  private purchaseErrorSub: any = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') return false;
      if (this.initialized) return true;

      await RNIap.initConnection();
      // Fetch products early to warm cache
      await this.getProducts();

      // Set up listeners once
      if (!this.purchaseUpdateSub) {
        this.purchaseUpdateSub = (RNIap as any).purchaseUpdatedListener(async (purchase: any) => {
          try {
            // Finish transaction so iOS doesn’t keep it in queue
            if (purchase.transactionId) {
              await RNIap.finishTransaction({ purchase, isConsumable: false });
            }
          } catch (e) {
            // Swallow; caller will also handle
          }
        });
      }

      if (!this.purchaseErrorSub) {
        this.purchaseErrorSub = (RNIap as any).purchaseErrorListener((_error: any) => {
          // No-op here; caller handles user feedback
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.log('IAP initialize error:', error);
      return false;
    }
  }

  async getProducts() {
    if (Platform.OS !== 'ios') return [];
    try {
      const skus = [IAP_PRODUCT_IDS.monthly, IAP_PRODUCT_IDS.yearly].filter(Boolean);
      const api: any = RNIap as any;
      const products = api.getSubscriptions
        ? await api.getSubscriptions(skus)
        : api.getProducts
        ? await api.getProducts({ skus })
        : [];
      return products;
    } catch (error) {
      console.log('IAP getProducts error:', error);
      return [];
    }
  }

  async requestSubscription(productId: string) {
    if (Platform.OS !== 'ios') return null;
    try {
      const api: any = RNIap as any;
      const result = api.requestSubscription
        ? await api.requestSubscription({ sku: productId })
        : api.requestPurchase
        ? await api.requestPurchase({ sku: productId })
        : null;
      return result;
    } catch (error) {
      console.log('IAP requestSubscription error:', error);
      throw error;
    }
  }

  async restorePurchases() {
    if (Platform.OS !== 'ios') return [];
    try {
      const purchases = await (RNIap as any).getAvailablePurchases();
      return purchases;
    } catch (error) {
      console.log('IAP restorePurchases error:', error);
      return [];
    }
  }

  async endConnection() {
    try {
      if (this.purchaseUpdateSub) {
        this.purchaseUpdateSub.remove?.();
        this.purchaseUpdateSub = null;
      }
      if (this.purchaseErrorSub) {
        this.purchaseErrorSub.remove?.();
        this.purchaseErrorSub = null;
      }
      if (this.initialized) {
        await (RNIap as any).endConnection?.();
        this.initialized = false;
      }
    } catch {}
  }
}

export const iapService = new IapService();


