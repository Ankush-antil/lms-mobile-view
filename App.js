import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Modal, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    const [updateStatus, setUpdateStatus] = useState('idle'); // 'checking', 'downloading', 'restarting', 'idle'

    useEffect(() => {
        async function checkAndApplyUpdates() {
            if (__DEV__) {
                console.log('[UPDATES] Skipping update check in development mode.');
                return;
            }
            try {
                setUpdateStatus('checking');
                console.log('[UPDATES] Checking for updates...');
                const update = await Updates.checkForUpdateAsync();
                
                if (update.isAvailable) {
                    setUpdateStatus('downloading');
                    console.log('[UPDATES] Downloading update...');
                    await Updates.fetchUpdateAsync();
                    
                    setUpdateStatus('restarting');
                    console.log('[UPDATES] Update downloaded. Restarting app...');
                    setTimeout(async () => {
                        await Updates.reloadAsync();
                    }, 1500);
                } else {
                    console.log('[UPDATES] No updates available.');
                    setUpdateStatus('idle');
                }
            } catch (error) {
                console.log('[UPDATES] Error checking/downloading updates:', error);
                setUpdateStatus('idle');
            }
        }

        checkAndApplyUpdates();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <SocketProvider>
                        <AppNavigator />
                        <Toast />
                    </SocketProvider>
                </AuthProvider>
            </SafeAreaProvider>

            {/* EAS Updates Loading Overlay */}
            <Modal
                visible={updateStatus !== 'idle'}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalBackground}>
                    <View style={styles.updateContainer}>
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text style={styles.titleText}>
                            {updateStatus === 'checking' && 'Checking for updates...'}
                            {updateStatus === 'downloading' && 'Downloading new update...'}
                            {updateStatus === 'restarting' && 'Applying update & restarting...'}
                        </Text>
                        <Text style={styles.subtitleText}>
                            {updateStatus === 'downloading' && 'Please wait while we update your app files.'}
                            {updateStatus !== 'downloading' && 'Please do not close the app.'}
                        </Text>
                    </View>
                </View>
            </Modal>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(11, 20, 26, 0.85)', // Whatsapp style overlay
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateContainer: {
        width: '80%',
        backgroundColor: '#1f2c34',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    titleText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    subtitleText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
});
