// src/services/iapService.ts
import { Platform, Alert } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts as getIapProducts, // Renamed from getProducts in newer versions
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
  type Product,
  type Purchase,
  type PurchaseError
} from 'react-native-iap';
import { verifyPurchase as verifyBackendPurchase } from './backendService';
import { t } from '../localization/i18n';

// Product IDs from Google Play Console
const productIds = Platform.select({
  android: [
    'coin_pack_starter', 
    'coin_pack_weekender', 
    'coin_pack_pro', 
    'coin_pack_whale'
  ],
  ios: [
    'coin_pack_starter', 
    'coin_pack_weekender', 
    'coin_pack_pro', 
    'coin_pack_whale'
  ], 
}) || [];

export interface ProductDisplay {
  productId: string;
  title: string;
  price: string;
  description: string;
  currency: string;
  localizedPrice: string;
}

export const initIAP = async (): Promise<void> => {
  try {
    await initConnection();
    // Note: flushFailedPurchasesCachedAsPendingAndroid is deprecated/handled automatically in v12+
  } catch (err) {
    console.error('IAP Initialization Error:', err);
  }
};

export const endIAP = async (): Promise<void> => {
  try {
    await endConnection();
  } catch (err) {
    console.error('IAP End Connection Error:', err);
  }
};

export const getProducts = async (): Promise<ProductDisplay[]> => {
  try {
    const result = await getIapProducts({ skus: productIds });
    
    // Fix: Handle 'products' possibly being null/undefined
    const products = result || [];
    
    return products.map((p) => {
        // Cast to any to handle property name changes in v12+ (id vs productId)
        // and platform differences (oneTimePurchaseOfferDetails vs direct properties)
        const raw = p as any;

        // In v12+, 'id' is often used instead of 'productId'
        const id = raw.id || raw.productId;
        
        // Handle Price Display (displayPrice is common in newer versions)
        const localizedPrice = 
            raw.displayPrice || 
            raw.localizedPrice || 
            raw.oneTimePurchaseOfferDetails?.formattedPrice || 
            '';

        const currency = 
            raw.currency || 
            raw.priceCurrencyCode || 
            raw.oneTimePurchaseOfferDetails?.priceCurrencyCode || 
            '';

        return {
            productId: id,
            title: raw.title?.replace(/\s?\(.*?\)$/, '') || '', 
            price: raw.price?.toString() || '', 
            description: raw.description || '',
            currency: currency,
            localizedPrice: localizedPrice,
        };
    });
  } catch (err) {
    console.error('IAP Get Products Error:', err);
    return [];
  }
};

export const purchaseProduct = async (productId: string): Promise<void> => {
  try {
    // Construct purchase arguments based on platform
    // Cast to any to avoid strict type errors if library types are mismatched
    const purchaseArgs: any = Platform.select({
      android: { skus: [productId] }, // Android requires 'skus' array
      ios: { sku: productId }         // iOS typically requires 'sku' string
    });

    await requestPurchase(purchaseArgs);
  } catch (err) {
    console.error('IAP Purchase Error:', err);
    throw err;
  }
};

// This function handles the purchase lifecycle
export const setupPurchaseListener = (
    onPurchaseSuccess: (coinsAdded: number) => void,
    onPurchaseError: (error: string) => void
) => {
    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
        // Cast to any to safely access platform-specific receipt fields
        const p = purchase as any;
        const receipt = p.transactionReceipt; // iOS
        const token = p.purchaseToken;        // Android
        
        if (receipt || token) {
            try {
                // Verify with our backend
                const result = await verifyBackendPurchase({
                    platform: Platform.OS === 'ios' ? 'ios' : 'android',
                    productId: purchase.productId,
                    transactionId: purchase.transactionId || '',
                    purchaseToken: token || undefined,
                    receiptData: receipt || undefined
                });

                // Finish transaction only after backend verification
                await finishTransaction({ purchase, isConsumable: true });
                
                onPurchaseSuccess(result.coins_added);
                
            } catch (error: any) {
                console.error('Purchase Verification Error:', error);
                // If backend error is not retryable, we usually still finish transaction to avoid stuck loop.
                // For now, alerting user.
                onPurchaseError(error.message || t('iap.errorVerification'));
            }
        }
    });

    const purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
        console.warn('IAP Purchase Error Listener:', error);
        // ErrorCode.E_USER_CANCELLED was renamed to ErrorCode.UserCancelled in recent versions
        if (error.code !== ErrorCode.UserCancelled) {
             onPurchaseError(error.message);
        }
    });

    return () => {
        if (purchaseUpdateSubscription) {
            purchaseUpdateSubscription.remove();
        }
        if (purchaseErrorSubscription) {
            purchaseErrorSubscription.remove();
        }
    };
};