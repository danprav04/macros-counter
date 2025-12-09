// src/services/iapService.ts
import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
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
    await RNIap.initConnection();
    if (Platform.OS === 'android') {
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
    }
  } catch (err) {
    console.error('IAP Initialization Error:', err);
  }
};

export const endIAP = async (): Promise<void> => {
  try {
    await RNIap.endConnection();
  } catch (err) {
    console.error('IAP End Connection Error:', err);
  }
};

export const getProducts = async (): Promise<ProductDisplay[]> => {
  try {
    const products = await RNIap.getProducts({ skus: productIds });
    return products.map(p => ({
        productId: p.productId,
        title: p.title.replace(/\s?\(.*?\)$/, ''), // Clean up "(App Name)" suffix on Android
        price: p.price,
        description: p.description,
        currency: p.currency,
        localizedPrice: p.localizedPrice,
    }));
  } catch (err) {
    console.error('IAP Get Products Error:', err);
    return [];
  }
};

export const purchaseProduct = async (productId: string): Promise<void> => {
  try {
    await RNIap.requestPurchase({ sku: productId });
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
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase: RNIap.Purchase) => {
        const receipt = purchase.transactionReceipt;
        
        if (receipt) {
            try {
                // Verify with our backend
                const result = await verifyBackendPurchase({
                    platform: Platform.OS === 'ios' ? 'ios' : 'android',
                    productId: purchase.productId,
                    transactionId: purchase.transactionId || '',
                    purchaseToken: Platform.OS === 'android' ? purchase.purchaseToken : undefined,
                    receiptData: Platform.OS === 'ios' ? receipt : undefined
                });

                // Finish transaction only after backend verification
                await RNIap.finishTransaction({ purchase, isConsumable: true });
                
                onPurchaseSuccess(result.coins_added);
                
            } catch (error: any) {
                console.error('Purchase Verification Error:', error);
                // If backend error is not retryable (e.g. duplicate), we might still want to finish transaction
                // For now, we alert.
                onPurchaseError(error.message || t('iap.errorVerification'));
            }
        }
    });

    const purchaseErrorSubscription = RNIap.purchaseErrorListener((error: RNIap.PurchaseError) => {
        console.warn('IAP Purchase Error Listener:', error);
        if (error.responseCode !== RNIap.ErrorCode.E_USER_CANCELLED) {
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