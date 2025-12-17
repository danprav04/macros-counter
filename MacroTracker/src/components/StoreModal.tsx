// src/components/StoreModal.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Overlay, Text, Button, Icon, useTheme, makeStyles } from '@rneui/themed';
import { t } from '../localization/i18n';
import { getProducts, purchaseProduct, ProductDisplay, setupPurchaseListener, initIAP, endIAP } from '../services/iapService';
import Toast from 'react-native-toast-message';
import { useAuth, AuthContextType } from '../context/AuthContext';
import { ErrorCode } from 'react-native-iap';
import { useCosts } from '../context/CostsContext';
import PriceTag from './PriceTag';

interface StoreModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const { refreshUser } = useAuth() as AuthContextType;
  const { costs } = useCosts();
  
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  
  // DEBUG STATE (Set to true if you need to see logs on screen during development)
  const SHOW_DEBUG_LOGS = false;
  const [logs, setLogs] = useState<string>('');

  const addLog = (msg: string) => {
      if (SHOW_DEBUG_LOGS) setLogs(prev => prev + msg + '\n');
      console.log(`[StoreModal] ${msg}`);
  };

  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    const initialize = async () => {
      if (isVisible) {
        setLoading(true);
        addLog('Initializing Store...'); 

        await initIAP();
        
        removeListeners = setupPurchaseListener(
            (coinsAdded) => {
                setPurchasingSku(null);
                
                // 1. Success Case (Instant Reward)
                if (coinsAdded > 0) {
                    Toast.show({
                        type: 'success',
                        text1: t('iap.purchaseSuccessTitle'),
                        text2: t('iap.purchaseSuccessMessage', { coins: coinsAdded }),
                        position: 'bottom'
                    });
                    refreshUser();
                    onClose();
                } 
                // 2. Pending Case (Slow Card / Pending Approval)
                else {
                    Toast.show({
                        type: 'info',
                        text1: t('iap.purchasePendingTitle'),
                        text2: t('iap.purchasePendingMessage'),
                        position: 'bottom',
                        visibilityTime: 6000 // Show longer so user sees it
                    });
                    // We do not close the modal immediately so they can see the pending state,
                    // but we stop the spinner.
                }
            },
            (errorMessage) => {
                // 3. Async Error Listener (e.g. Card Declined mid-process)
                setPurchasingSku(null);
                
                // Don't show alert for user cancellation events coming from listener
                // We assume the immediate catch block handles the user interaction feedback
                if (!errorMessage.toLowerCase().includes('cancel')) {
                    Alert.alert(t('iap.errorTitle'), errorMessage);
                }
            }
        );

        // Fetch Products
        try {
            const items = await getProducts((newLog) => addLog(newLog.trim()));
            // Sort by price/id
            const sortOrder = ['coin_pack_starter', 'coin_pack_weekender', 'coin_pack_pro', 'coin_pack_whale'];
            items.sort((a, b) => sortOrder.indexOf(a.productId) - sortOrder.indexOf(b.productId));
            setProducts(items);
        } catch (e) {
            addLog(`Error fetching products: ${e}`);
        } finally {
            setLoading(false);
        }
      }
    };

    initialize();

    return () => {
        if (removeListeners) removeListeners();
        if (isVisible) endIAP(); 
    };
  }, [isVisible]);

  const handleBuy = async (sku: string) => {
      setPurchasingSku(sku);
      addLog(`Initiating buy for ${sku}...`);
      
      try {
          await purchaseProduct(sku);
          // If successful, the flow continues to the Listener (setupPurchaseListener).
          // We wait here until the listener fires or an error is thrown.
      } catch (error: any) {
          addLog(`Buy Catch: ${error.code} - ${error.message}`);
          setPurchasingSku(null);

          // 4. Handle Immediate Errors (User Cancellation or Setup Failure)
          // Fixed ErrorCode enum property access based on latest react-native-iap types
          if (error.code === ErrorCode.UserCancelled || error.message.toLowerCase().includes('cancel')) {
              Toast.show({
                  type: 'info',
                  text1: t('iap.purchaseCancelled'),
                  position: 'bottom',
                  visibilityTime: 2000
              });
          } else {
              // Actual error (Network, Invalid ID, etc.)
              Alert.alert(t('iap.errorTitle'), error.message || t('iap.purchaseFailedGeneric'));
          }
      }
  };

  const getCoinAmount = (productId: string): number => {
      switch(productId) {
          case 'coin_pack_starter': return 150;
          case 'coin_pack_weekender': return 500;
          case 'coin_pack_pro': return 1200;
          case 'coin_pack_whale': return 3000;
          default: return 0;
      }
  };

  const renderProductItem = (item: ProductDisplay) => {
      const coins = getCoinAmount(item.productId);
      const isBuying = purchasingSku === item.productId;

      return (
          <View key={item.productId} style={styles.productCard}>
              <View style={styles.productInfo}>
                  <View style={styles.coinHeader}>
                      <Icon name="database" type="material-community" color={theme.colors.primary} size={20} />
                      <Text style={styles.coinText}>{coins} Coins</Text>
                  </View>
                  <Text style={styles.productTitle}>{item.title}</Text>
                  <Text style={styles.productDesc}>{item.description}</Text>
              </View>
              <Button
                title={isBuying ? "" : item.localizedPrice}
                onPress={() => handleBuy(item.productId)}
                disabled={purchasingSku !== null}
                loading={isBuying}
                buttonStyle={styles.buyButton}
                containerStyle={styles.buyButtonContainer}
              />
          </View>
      );
  };

  const renderPricingTable = () => {
      if (!costs) return null;

      const pricingItems = [
          { label: t('iap.costImageSingle'), amount: costs.cost_macros_image_single },
          { label: t('iap.costImageMulti'), amount: costs.cost_macros_image_multiple },
          { label: t('iap.costTextMult'), amount: costs.cost_macros_text_multiple },
          { label: t('iap.costTextRecp'), amount: costs.cost_macros_recipe },
          { label: t('iap.costPortion'), amount: costs.cost_grams_natural_language },
      ];

      return (
          <View style={styles.pricingContainer}>
              <Text style={styles.pricingHeader}>{t('iap.currentPrices')}</Text>
              <View style={styles.pricingGrid}>
                  {pricingItems.map((item, index) => (
                      <View key={index} style={styles.pricingItem}>
                          <Text style={styles.pricingLabel}>{item.label}</Text>
                          <PriceTag amount={item.amount} type="cost" size="small" />
                      </View>
                  ))}
              </View>
          </View>
      );
  };

  const renderContent = () => {
      if (products.length > 0) {
          return products.map(renderProductItem);
      }
      
      if (loading) {
          return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{marginTop: 10, color: theme.colors.grey3}}>Loading Products...</Text>
            </View>
          );
      }

      return <Text style={styles.emptyText}>{t('iap.noProducts')}</Text>;
  };

  return (
    <Overlay 
        isVisible={isVisible} 
        onBackdropPress={purchasingSku ? undefined : onClose} 
        overlayStyle={styles.overlay}
        animationType="slide"
    >
        <View style={styles.container}>
            <View style={styles.header}>
                <Text h4 style={styles.headerTitle}>{t('iap.storeTitle')}</Text>
                <TouchableOpacity onPress={onClose} disabled={purchasingSku !== null}>
                    <Icon name="close" type="material" size={28} color={theme.colors.grey3} />
                </TouchableOpacity>
            </View>
            
            {SHOW_DEBUG_LOGS && (
                <View style={styles.debugBox}>
                    <Text style={styles.debugHeader}>DEBUG CONSOLE:</Text>
                    <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                        <Text style={styles.debugText}>{logs}</Text>
                    </ScrollView>
                </View>
            )}

            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderPricingTable()}
                    <Text style={styles.productsHeader}>Top Ups</Text>
                    {renderContent()}
                </ScrollView>
            </View>
        </View>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlay: {
        width: '90%',
        height: '90%',
        borderRadius: 20,
        padding: 0,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        flexShrink: 0,
    },
    headerTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    debugBox: {
        height: 120,
        backgroundColor: '#000',
        margin: 10,
        padding: 8,
        borderRadius: 5,
        flexShrink: 0,
    },
    debugHeader: {
        color: '#FFF', 
        fontSize: 10, 
        fontWeight: 'bold', 
        marginBottom: 5
    },
    debugText: {
        color: '#0F0', 
        fontSize: 10, 
        fontFamily: 'monospace'
    },
    contentContainer: {
        flex: 1, 
        minHeight: 0, 
    },
    loadingContainer: {
        padding: 30,
        alignItems: 'center',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 40,
    },
    pricingContainer: {
        backgroundColor: theme.colors.grey0,
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    pricingHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    pricingGrid: {
        gap: 8,
    },
    pricingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pricingLabel: {
        color: theme.colors.secondary,
        fontSize: 14,
        flex: 1,
    },
    productsHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
        marginLeft: 5,
    },
    productCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    productInfo: {
        flex: 1,
        marginRight: 10,
    },
    coinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    coinText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 6,
    },
    productTitle: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 2,
    },
    productDesc: {
        color: theme.colors.grey3,
        fontSize: 12,
    },
    buyButton: {
        borderRadius: 20,
        paddingHorizontal: 20,
        minWidth: 100,
        backgroundColor: theme.colors.success,
    },
    buyButtonContainer: {
        borderRadius: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.grey3,
        marginTop: 20,
    }
}));

export default StoreModal;