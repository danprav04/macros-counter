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
    // 1. Log the IDs we are requesting
    console.log('[IAP Debug] Requesting SKUs:', productIds);

    // 2. Ensure connection is active
    try {
        await initConnection();
    } catch (e: any) {
        Alert.alert("IAP Error", `Connection failed: ${e.message}`);
        return [];
    }

    // 3. Fetch products
    const result = await getIapProducts({ skus: productIds });
    console.log('[IAP Debug] Result:', result);
    
    // 4. Alert if empty (For debugging only - remove before public launch)
    if (!result || result.length === 0) {
        const msg = `Google returned 0 products.\n\nChecked SKUs:\n${productIds.join('\n')}`;
        Alert.alert("IAP Debug: Empty List", msg);
        return [];
    }

    return result.map((p) => {
        // Cast to any to safely access fields across different library versions
        const raw = p as any;
        
        // Log the raw item to see what Google actually sent
        console.log('[IAP Debug] Item:', raw);

        const id = raw.productId || raw.id;
        
        // Robust price extraction
        const localizedPrice = 
            raw.localizedPrice || 
            raw.oneTimePurchaseOfferDetails?.formattedPrice || 
            raw.price ||
            'Unavailable';

        const currency = 
            raw.priceCurrencyCode || 
            raw.oneTimePurchaseOfferDetails?.priceCurrencyCode || 
            'USD';

        return {
            productId: id,
            title: raw.title?.replace(/\s?\(.*?\)$/, '') || 'Unknown Title', 
            price: raw.price?.toString() || '', 
            description: raw.description || '',
            currency: currency,
            localizedPrice: localizedPrice,
        };
    });
  } catch (err: any) {
    console.error('[IAP] Get Products Error:', err);
    // Show the actual error on screen
    Alert.alert("IAP Fetch Error", `Code: ${err.code}\nMessage: ${err.message}`);
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