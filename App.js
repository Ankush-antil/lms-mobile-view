import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
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
        </GestureHandlerRootView>
    );
}
