// src/components/FirstRunModal.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { t } from '../localization/i18n';

export interface MissingConsents {
    tos: boolean;
    health: boolean;
    transfer: boolean;
    medical: boolean;
    hitl: boolean; // Human in the Loop
    // localStorageAck is implicit if ToS is re-agreed to, but we track UI state locally.
}

interface FirstRunModalProps {
    isVisible: boolean;
    missingConsents: MissingConsents;
    onAgree: (updatedConsents: MissingConsents) => Promise<void>;
}

// Local Interface extending MissingConsents to track checkbox state for UI only
interface LocalConsentState extends MissingConsents {
    localStorageAck: boolean;
}

interface CustomCheckboxProps {
    checked: boolean;
    onPress: () => void;
    children: React.ReactNode;
    checkedColor?: string;
    uncheckedColor?: string;
    iconChecked?: string;
    iconUnchecked?: string;
    containerStyle?: object;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ 
    checked, 
    onPress, 
    children, 
    checkedColor, 
    uncheckedColor, 
    iconChecked = 'checkbox-marked',
    iconUnchecked = 'checkbox-blank-outline',
    containerStyle
}) => {
    const { theme } = useTheme();
    const activeColor = checkedColor || theme.colors.primary;
    const inactiveColor = uncheckedColor || theme.colors.grey3;

    return (
        <TouchableOpacity 
            onPress={onPress} 
            activeOpacity={0.7} 
            style={[styles.customRow, containerStyle]}
        >
            <Icon
                name={checked ? iconChecked : iconUnchecked}
                type="material-community"
                size={24}
                color={checked ? activeColor : inactiveColor}
                style={styles.iconStyle}
            />
            <View style={styles.textContainer}>
                {children}
            </View>
        </TouchableOpacity>
    );
};

interface ViewerConfig {
    title: string;
    url: string;
}

const FirstRunModal: React.FC<FirstRunModalProps> = ({ 
    isVisible, 
    missingConsents, 
    onAgree 
}) => {
    const { theme } = useTheme();
    
    // Local state to track checkboxes inside the modal
    const [checkedState, setCheckedState] = useState<LocalConsentState>({
        tos: false,
        health: false,
        transfer: false,
        medical: false,
        hitl: false,
        localStorageAck: false // Defaults to false, required if ToS is updated
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [viewerConfig, setViewerConfig] = useState<ViewerConfig | null>(null);

    // Reset local state when modal opens or requirements change
    useEffect(() => {
        if (isVisible) {
            setCheckedState({
                tos: !missingConsents.tos, // If NOT missing, it's already checked (implicitly)
                health: !missingConsents.health,
                transfer: !missingConsents.transfer,
                medical: !missingConsents.medical,
                hitl: !missingConsents.hitl,
                // If ToS is missing (update required), we enforce re-ack of local storage
                localStorageAck: !missingConsents.tos 
            });
        }
    }, [isVisible, missingConsents]);

    const toggleCheck = (key: keyof LocalConsentState) => {
        setCheckedState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        // We pass back the missing consents structure. LocalStorageAck isn't sent to backend directly
        // but acts as a gate here.
        await onAgree(checkedState); 
        setIsSaving(false);
    };

    const handleOpenTerms = () => {
        const url = `${Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION}/terms-of-service`;
        setViewerConfig({ title: t('termsGate.viewTerms'), url });
    };

    const handleOpenPrivacy = () => {
        const url = `${Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION}/privacy-policy`;
        setViewerConfig({ title: t('termsGate.viewPrivacy'), url });
    };

    const handleCloseViewer = () => {
        setViewerConfig(null);
    };

    const allRequiredChecked = 
        checkedState.tos && 
        checkedState.health && 
        checkedState.transfer && 
        checkedState.medical && 
        checkedState.hitl &&
        checkedState.localStorageAck;

    return (
        <Modal 
            visible={isVisible} 
            transparent={true} 
            animationType="fade"
            onRequestClose={() => {
                if (viewerConfig) handleCloseViewer();
            }}
        >
            <View style={[styles.backdrop, viewerConfig ? styles.backdropFull : null]}>
                {viewerConfig ? (
                    <SafeAreaView style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
                        <View style={styles.viewerHeader}>
                            <View style={{ width: 40 }} />
                            <Text h4 style={[styles.viewerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                {viewerConfig.title}
                            </Text>
                            <TouchableOpacity onPress={handleCloseViewer} style={styles.viewerCloseButton}>
                                <Icon name="close" type="material" size={28} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, width: '100%' }}>
                            <WebView 
                                source={{ uri: viewerConfig.url }} 
                                startInLoadingState 
                                renderLoading={() => (
                                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                                        <ActivityIndicator size="large" color={theme.colors.primary} />
                                    </View>
                                )}
                                containerStyle={{ backgroundColor: theme.colors.background }}
                                style={{ backgroundColor: 'transparent' }}
                            />
                        </View>
                    </SafeAreaView>
                ) : (
                    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.header}>
                                <Icon name="shield-check-outline" type="material-community" size={48} color={theme.colors.primary} />
                                <Text h4 style={[styles.title, { color: theme.colors.text }]}>
                                    {t('firstRunModal.title')}
                                </Text>
                                <Text style={[styles.subtitle, { color: theme.colors.grey2 }]}>
                                    We've updated our legal terms and safety requirements. Please review and agree to continue.
                                </Text>
                            </View>
                            
                            <View style={styles.content}>
                                {missingConsents.tos && (
                                    <>
                                        <CustomCheckbox
                                            checked={checkedState.tos}
                                            onPress={() => toggleCheck('tos')}
                                        >
                                            <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                                                {t('termsGate.iAgree')}
                                                <Text style={[styles.link, { color: theme.colors.primary }]} onPress={handleOpenTerms}>
                                                    {t('termsGate.viewTerms')}
                                                </Text>
                                            </Text>
                                        </CustomCheckbox>

                                        {/* New Local Storage Ack - Tied to ToS Update */}
                                        <CustomCheckbox
                                            checked={checkedState.localStorageAck}
                                            onPress={() => toggleCheck('localStorageAck')}
                                            checkedColor={theme.colors.error}
                                            iconChecked="alert-box"
                                        >
                                            <Text style={[styles.checkboxText, { color: theme.colors.error, fontWeight: 'bold' }]}>
                                                {t('termsGate.localStorageAck')}
                                            </Text>
                                        </CustomCheckbox>
                                    </>
                                )}

                                {missingConsents.health && (
                                    <CustomCheckbox
                                        checked={checkedState.health}
                                        onPress={() => toggleCheck('health')}
                                    >
                                        <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                                            {t('termsGate.consentHealth')}
                                            {" "}
                                            <Text style={[styles.link, { color: theme.colors.primary }]} onPress={handleOpenPrivacy}>
                                                {t('termsGate.viewPrivacy')}
                                            </Text>
                                        </Text>
                                    </CustomCheckbox>
                                )}

                                {missingConsents.transfer && (
                                    <CustomCheckbox
                                        checked={checkedState.transfer}
                                        onPress={() => toggleCheck('transfer')}
                                    >
                                        <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                                            {t('termsGate.consentTransfer')}
                                        </Text>
                                    </CustomCheckbox>
                                )}

                                {missingConsents.medical && (
                                    <CustomCheckbox
                                        checked={checkedState.medical}
                                        onPress={() => toggleCheck('medical')}
                                        checkedColor={theme.colors.warning}
                                        iconChecked="alert-box"
                                    >
                                        <Text style={[styles.checkboxText, { color: theme.colors.text, fontWeight: '600' }]}>
                                            {t('termsGate.notMedical')}
                                        </Text>
                                    </CustomCheckbox>
                                )}

                                {missingConsents.hitl && (
                                    <View style={styles.hitlSection}>
                                        <View style={[styles.warningBox, { borderColor: theme.colors.warning, backgroundColor: theme.mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)' }]}>
                                            <View style={styles.warningHeader}>
                                                <Icon name="robot" type="material-community" size={20} color={theme.colors.warning} style={{marginRight: 8}}/>
                                                <Text style={[styles.warningTitle, { color: theme.colors.warning }]}>AI DISCLAIMER</Text>
                                            </View>
                                            <Text style={[styles.warningText, { color: theme.colors.text }]}>
                                                {t('disclaimers.aiWarning')}
                                            </Text>
                                        </View>
                                        <CustomCheckbox
                                            checked={checkedState.hitl}
                                            onPress={() => toggleCheck('hitl')}
                                            checkedColor={theme.colors.success}
                                            containerStyle={{ marginTop: 5 }}
                                        >
                                            <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                                                {t('firstRunModal.humanInTheLoopText')}
                                            </Text>
                                        </CustomCheckbox>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <Button
                            title={t('firstRunModal.buttonAgree')}
                            onPress={handleConfirm}
                            disabled={!allRequiredChecked || isSaving}
                            loading={isSaving}
                            buttonStyle={styles.button}
                            titleStyle={styles.buttonTitle}
                            containerStyle={styles.buttonContainer}
                            disabledStyle={{ backgroundColor: theme.colors.grey1 }}
                        />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backdropFull: {
        padding: 0,
        backgroundColor: '#000', 
    },
    container: {
        width: '100%',
        maxWidth: 450,
        maxHeight: '85%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        marginTop: 15,
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 22,
    },
    subtitle: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 14,
        paddingHorizontal: 10,
        lineHeight: 20,
    },
    content: {
        width: '100%',
        marginBottom: 20,
    },
    hitlSection: {
        marginTop: 10,
    },
    warningBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    warningTitle: {
        fontWeight: '700',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
    customRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        width: '100%',
    },
    iconStyle: {
        marginRight: 12,
        marginTop: 0,
    },
    textContainer: {
        flex: 1,
    },
    checkboxText: {
        fontSize: 15,
        fontWeight: '400',
        lineHeight: 22,
        textAlign: 'left',
    },
    link: {
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        width: '100%',
        marginTop: 10,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: '#2e86de',
    },
    buttonTitle: {
        fontWeight: '700',
        fontSize: 16,
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    viewerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewerCloseButton: {
        padding: 5,
        width: 40,
        alignItems: 'flex-end',
    },
});

export default FirstRunModal;