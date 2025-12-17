// src/components/StoreModal.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Overlay, Text, Button, Icon, useTheme, makeStyles } from '@rneui/themed';
import { t } from '../localization/i18n';
import { getProducts, purchaseProduct, ProductDisplay, setupPurchaseListener, initIAP, endIAP } from '../services/iapService';
import Toast from 'react-native-toast-message';
import { useAuth, AuthContextType } from '../context/AuthContext';

interface StoreModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const { refreshUser } = useAuth() as AuthContextType;
  
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  
  // DEBUG STATE
  const [logs, setLogs] = useState<string>('');
  
  // Toggle to show/hide debug console (Hidden for production UI)
  const SHOW_DEBUG_LOGS = false;

  const addLog = (msg: string) => {
      setLogs(prev => prev + msg + '\n');
  };

  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    const initialize = async () => {
      if (isVisible) {
        setLoading(true);
        setLogs('Initializing Store...\n'); 

        await initIAP();
        
        removeListeners = setupPurchaseListener(
            (coinsAdded) => {
                setPurchasingSku(null);
                
                // Handle distinctions between Immediate Success and Pending (Slow Card)
                if (coinsAdded > 0) {
                    Toast.show({
                        type: 'success',
                        text1: t('iap.purchaseSuccessTitle'),
                        text2: t('iap.purchaseSuccessMessage', { coins: coinsAdded }),
                        position: 'bottom'
                    });
                } else {
                    // coinsAdded === 0 indicates a Pending transaction (e.g. Slow Test Card)
                    Toast.show({
                        type: 'info',
                        text1: t('iap.purchasePendingTitle'),
                        text2: t('iap.purchasePendingMessage'),
                        position: 'bottom',
                        visibilityTime: 6000 // Show longer for awareness
                    });
                }
                
                refreshUser();
                onClose();
            },
            (errorMessage) => {
                setPurchasingSku(null);
                Alert.alert(t('iap.errorTitle'), errorMessage);
            }
        );

        // Call getProducts with the logging callback
        const items = await getProducts((newLog) => {
            // Using the local helper to ensure state updates cleanly
            addLog(newLog.trim());
        });

        addLog(`8. Fetched ${items.length} items. Sorting...`);

        // Simple sort
        const sortOrder = ['coin_pack_starter', 'coin_pack_weekender', 'coin_pack_pro', 'coin_pack_whale'];
        items.sort((a, b) => sortOrder.indexOf(a.productId) - sortOrder.indexOf(b.productId));
        
        setProducts(items);
        setLoading(false);
        addLog('9. DONE. Loading set to false.');
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
      addLog(`Buying ${sku}...`);
      try {
          await purchaseProduct(sku);
      } catch (error: any) {
          addLog(`Buy Error: ${error.message}`);
          setPurchasingSku(null);
          // UX Fix: Alert the user if initiation fails (e.g. network error, validation error)
          Alert.alert(t('iap.errorTitle'), error.message || 'Failed to initiate purchase.');
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

  // Determine what to render in the content area
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
            
            {/* === DEBUG LOG VIEWER (Hidden unless enabled) === */}
            {SHOW_DEBUG_LOGS && (
                <View style={styles.debugBox}>
                    <Text style={styles.debugHeader}>DEBUG CONSOLE:</Text>
                    <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                        <Text style={styles.debugText}>{logs}</Text>
                    </ScrollView>
                </View>
            )}

            {/* === MAIN CONTENT SCROLLVIEW === */}
            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
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
        height: '90%', // Fixed height to prevent collapse
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
        height: 120, // Reduced height for logs
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
        flex: 1, // Take remaining space
        minHeight: 0, // Crucial for nested flex containers
    },
    loadingContainer: {
        padding: 30,
        alignItems: 'center',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 40,
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