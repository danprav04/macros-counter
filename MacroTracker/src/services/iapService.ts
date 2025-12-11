// src/services/iapService.ts
import { Platform, Alert } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts as getIapProducts, 
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

/**
 * Modified getProducts for On-Screen Debugging
 * Accepts an optional callback to stream logs to the UI.
 */
export const getProducts = async (onLog?: (msg: string) => void): Promise<ProductDisplay[]> => {
  const log = (msg: string) => {
      console.log(msg); 
      if (onLog) onLog(msg + '\n'); 
  };

  try {
    log('1. Starting getProducts...');
    log(`2. IDs: ${JSON.stringify(productIds)}`);

    // STEP A: CONNECTION
    log('3. Calling initConnection()...');
    try {
        const connectionResult = await initConnection();
        log(`4. Connection Result: ${JSON.stringify(connectionResult)}`);
    } catch (connErr: any) {
        log(`4. ERROR: initConnection failed: ${connErr.message}`);
        return [];
    }

    // STEP B: FETCHING
    log('5. Calling fetchProducts...');
    const result = await getIapProducts({ skus: productIds });
    
    if (!result) {
        log('6. Result is NULL or UNDEFINED');
        return [];
    }

    log(`6. Result length: ${result.length}`);

    if (result.length > 0) {
        const firstItem = result[0] as any;
        log(`7. First Item ID: ${firstItem.productId || firstItem.id}`);
    } else {
        log('7. WARNING: Array is empty. Check Google Console Config.');
    }

    // STEP C: MAPPING
    return result.map((p: any) => {
        const raw = p;
        const id = raw.id || raw.productId;
        const localizedPrice = 
            raw.displayPrice || 
            raw.localizedPrice || 
            raw.oneTimePurchaseOfferDetails?.formattedPrice || 
            '';
            
        return {
            productId: id,
            title: raw.title?.replace(/\s?\(.*?\)$/, '') || '', 
            price: raw.price?.toString() || '', 
            description: raw.description || '',
            currency: raw.currency || '',
            localizedPrice: localizedPrice,
        };
    });

  } catch (err: any) {
    log(`CRITICAL CATCH: ${err.message}`);
    if (err.code) log(`ERROR CODE: ${err.code}`);
    return [];
  }
};

export const purchaseProduct = async (productId: string): Promise<void> => {
  try {
    console.log(`[IAP] Requesting purchase for sku: ${productId}`);
    
    // FIX: Cast object to 'any' to resolve TypeScript error 2353.
    // We strictly use 'sku' (singular) here to fix the runtime "Missing purchase request configuration" error.
    await requestPurchase({ sku: productId } as any);
    
  } catch (err) {
    console.error('IAP Purchase Error:', err);
    throw err;
  }
};

export const setupPurchaseListener = (
    onPurchaseSuccess: (coinsAdded: number) => void,
    onPurchaseError: (error: string) => void
) => {
    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
        const p = purchase as any;
        const receipt = p.transactionReceipt; // iOS
        const token = p.purchaseToken;        // Android
        
        console.log('[IAP] Purchase Updated:', purchase.productId);

        if (receipt || token) {
            try {
                console.log('[IAP] Verifying with backend...');
                const result = await verifyBackendPurchase({
                    platform: Platform.OS === 'ios' ? 'ios' : 'android',
                    productId: purchase.productId,
                    transactionId: purchase.transactionId || '',
                    purchaseToken: token || undefined,
                    receiptData: receipt || undefined
                });

                console.log('[IAP] Backend verification success. Finishing transaction.');
                await finishTransaction({ purchase, isConsumable: true });
                onPurchaseSuccess(result.coins_added);
                
            } catch (error: any) {
                console.error('Purchase Verification Error:', error);
                // Even on error, we might want to alert the user but NOT finish the transaction
                // so they can try to "Restore" or we can retry later.
                onPurchaseError(error.message || t('iap.errorVerification'));
            }
        }
    });

    const purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
        console.warn('IAP Purchase Error Listener:', error);
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