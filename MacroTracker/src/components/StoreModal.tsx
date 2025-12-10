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

  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    const initialize = async () => {
      if (isVisible) {
        setLoading(true);
        setLogs('Initializing Store...\n'); // Reset logs

        await initIAP();
        
        removeListeners = setupPurchaseListener(
            (coinsAdded) => {
                setPurchasingSku(null);
                Toast.show({
                    type: 'success',
                    text1: t('iap.purchaseSuccessTitle'),
                    text2: t('iap.purchaseSuccessMessage', { coins: coinsAdded }),
                    position: 'bottom'
                });
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
            setLogs(prev => prev + newLog);
        });

        // Simple sort by price estimation or ID
        const sortOrder = ['coin_pack_starter', 'coin_pack_weekender', 'coin_pack_pro', 'coin_pack_whale'];
        items.sort((a, b) => sortOrder.indexOf(a.productId) - sortOrder.indexOf(b.productId));
        
        setProducts(items);
        setLoading(false);
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
      try {
          await purchaseProduct(sku);
      } catch (error) {
          setPurchasingSku(null);
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
            
            {/* === DEBUG LOG VIEWER START === */}
            <View style={{ height: 150, backgroundColor: '#000', margin: 10, padding: 5, borderRadius: 5 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>DEBUG CONSOLE:</Text>
                <ScrollView nestedScrollEnabled>
                    <Text style={{ color: '#0F0', fontSize: 10, fontFamily: 'monospace' }}>
                        {logs}
                    </Text>
                </ScrollView>
            </View>
            {/* === DEBUG LOG VIEWER END === */}
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {products.length > 0 ? (
                        products.map(renderProductItem)
                    ) : (
                        <Text style={styles.emptyText}>{t('iap.noProducts')}</Text>
                    )}
                </ScrollView>
            )}
        </View>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlay: {
        width: '90%',
        maxHeight: '90%', // Increased height to fit logs
        borderRadius: 20,
        padding: 0,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    headerTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    loadingContainer: {
        padding: 50,
        alignItems: 'center',
    },
    scrollContent: {
        padding: 15,
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