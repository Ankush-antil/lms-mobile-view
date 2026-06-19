import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Vibration,
    Platform,
    PermissionsAndroid,
    ScrollView
} from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';
import { colors, spacing, fontSizes, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // Call States: 'idle', 'dialing', 'incoming', 'connected', 'offline', 'declined', 'ended'
    const [callState, setCallState] = useState('idle'); 
    const [callInfo, setCallInfo] = useState({
        targetId: '',
        targetName: '',
        targetRole: '',
        callLogId: '',
        isCaller: false,
        callType: 'audio' // 'audio' | 'video'
    });
    
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true);
    const [debugLogs, setDebugLogs] = useState([]);

    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const vibrationIntervalRef = useRef(null);
    const soundRef = useRef(null);
    const webViewRef = useRef(null);

    // Request Camera & Audio Permissions for WebRTC inside WebView on Android/iOS
    const requestCallPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                console.log('[PERMISSIONS] Android call permissions status:', granted);
                
                if (
                    granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
                    granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    Toast.show({
                        type: 'info',
                        text1: 'Permissions Needed',
                        text2: 'Camera & Microphone access are required for voice/video call streaming.'
                    });
                }
            } catch (err) {
                console.log('[PERMISSIONS] Error requesting Android call permissions:', err);
            }
        } else {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                console.log('[PERMISSIONS] iOS Audio permission status:', status);
            } catch (err) {
                console.log('[PERMISSIONS] Error requesting iOS call permissions:', err);
            }
        }
    };

    // Audio Playback Helpers for Ringtone and Dialtone
    const playSound = async (type) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: false,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });

            // Load audio from Render backend server statically
            const url = type === 'dialing' 
                ? 'https://lms-mobile-view.onrender.com/uploads/dialing.mp3' 
                : 'https://lms-mobile-view.onrender.com/uploads/ringtone.mp3';

            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            soundRef.current = sound;
        } catch (error) {
            console.log('[AUDIO] Error playing sound:', error);
        }
    };

    const stopSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            // Reset audio mode to allow microphone capture in Jitsi WebView
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: false,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });
        } catch (error) {
            console.log('[AUDIO] Error stopping sound:', error);
        }
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        console.log('[CALL] Toggling mute to:', nextMuted);
        if (webViewRef.current) {
            const jsInject = `
                try {
                    if (window.APP && window.APP.conference) {
                        window.APP.conference.muteAudio(${nextMuted});
                    }
                } catch(e) {
                    console.warn('Mute injection failed:', e);
                }
                true;
            `;
            webViewRef.current.injectJavaScript(jsInject);
        }
    };

    const toggleSpeaker = async () => {
        try {
            const nextSpeaker = !isSpeaker;
            setIsSpeaker(nextSpeaker);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: !nextSpeaker,
                playThroughEarpieceAndroid: !nextSpeaker,
                staysActiveInBackground: true,
            });
            console.log('[AUDIO] Speaker toggled to:', nextSpeaker);
        } catch (error) {
            console.log('[AUDIO] Error toggling speaker:', error);
        }
    };

    const debugInjection = `
        (function() {
            var origLog = console.log;
            var origError = console.error;
            var origWarn = console.warn;
            
            console.log = function() {
                var args = Array.prototype.slice.call(arguments);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: args.join(' ') }));
                origLog.apply(console, arguments);
            };
            
            console.error = function() {
                var args = Array.prototype.slice.call(arguments);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: args.join(' ') }));
                origError.apply(console, arguments);
            };

            console.warn = function() {
                var args = Array.prototype.slice.call(arguments);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WARN', message: args.join(' ') }));
                origWarn.apply(console, arguments);
            };

            window.onerror = function(message, source, lineno, colno, error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    type: 'ERROR', 
                    message: message + ' at ' + (source || '').split('/').pop() + ':' + lineno 
                }));
                return false;
            };
            origLog('Logger bridge injected.');
        })();
        true;
    `;

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            const formatted = `[${data.type}] ${data.message}`;
            setDebugLogs(prev => [...prev.slice(-30), formatted]);
            console.log('[JITSI WEBVIEW]', formatted);
        } catch (e) {
            console.log('[JITSI WEBVIEW RAW]', event.nativeEvent.data);
        }
    };

    // Dynamic Ringtone/Vibration for incoming calls
    const startVibration = () => {
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            Vibration.vibrate([500, 1000, 500, 1000], true);
        }
    };

    const stopVibration = () => {
        Vibration.cancel();
    };

    const handleEndCallLocally = (finalState) => {
        stopVibration();
        stopSound();
        setIsMuted(false);
        setIsSpeaker(true);
        setDebugLogs([]);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (finalState === 'idle') {
            setCallState('idle');
            setCallInfo({
                targetId: '',
                targetName: '',
                targetRole: '',
                callLogId: '',
                isCaller: false,
                callType: 'audio'
            });
            setCallDuration(0);
            return;
        }

        setCallState(finalState);
        setTimeout(() => {
            setCallState('idle');
            setCallInfo({
                targetId: '',
                targetName: '',
                targetRole: '',
                callLogId: '',
                isCaller: false,
                callType: 'audio'
            });
            setCallDuration(0);
        }, 2000);
    };

    // Socket Connection Setup
    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                setSocket(null);
            }
            return;
        }

        console.log('[SOCKET] Connecting to server with user:', user.name);
        const s = io('https://lms-mobile-view.onrender.com', {
            transports: ['websocket'],
            forceNew: true,
            autoConnect: true
        });

        socketRef.current = s;
        setSocket(s);

        s.on('connect_error', (error) => {
            console.log('[SOCKET] Connection error:', error.message || error);
        });

        const registerUserSocket = () => {
            if (user?._id) {
                console.log('[SOCKET] Registering user:', user._id);
                s.emit('register', { userId: user._id, role: user.role, name: user.name });
                s.emit('get-online-users', (users) => {
                    setOnlineUsers(users || []);
                });
            }
        };

        if (s.connected) {
            registerUserSocket();
        }

        s.on('connect', () => {
            console.log('[SOCKET] Connected to Render socket server successfully.');
            registerUserSocket();
        });

        // Request calling permissions immediately on app/socket mount
        requestCallPermissions();

        s.on('online-status-update', (users) => {
            setOnlineUsers(users || []);
        });

        // Incoming Call Event
        s.on('incoming-call', ({ callerId, callerName, callLogId, callType }) => {
            console.log(`[SOCKET] Incoming ${callType} call from ${callerName} (${callerId})`);
            
            // Auto reject if already busy
            if (callState !== 'idle') {
                s.emit('reject-call', { callerId, callLogId });
                return;
            }

            setCallState('incoming');
            setCallInfo({
                targetId: callerId,
                targetName: callerName,
                targetRole: user.role === 'Teacher' ? 'Student' : 'Teacher',
                callLogId,
                isCaller: false,
                callType: callType || 'audio'
            });
            startVibration();
            playSound('ringtone');
        });

        // Call Accepted Event
        s.on('call-accepted', async ({ callLogId }) => {
            console.log('[SOCKET] Call accepted by peer. Requesting permissions...');
            await requestCallPermissions();
            stopVibration();
            stopSound();
            setCallState('connected');
            setCallInfo(prev => ({ ...prev, callLogId }));
        });

        // Call Rejected Event
        s.on('call-rejected', () => {
            console.log('[SOCKET] Call rejected by peer');
            handleEndCallLocally('declined');
        });

        // User Offline Event
        s.on('user-offline', () => {
            console.log('[SOCKET] Called user is offline');
            handleEndCallLocally('offline');
        });

        // Call Ended Event
        s.on('call-ended', () => {
            console.log('[SOCKET] Call ended by peer');
            handleEndCallLocally('ended');
        });

        s.on('disconnect', () => {
            console.log('[SOCKET] Socket disconnected');
            handleEndCallLocally('ended');
        });

        return () => {
            s.disconnect();
            stopVibration();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [user]);

    // Active Call Duration Timer
    useEffect(() => {
        if (callState === 'connected') {
            setCallDuration(0);
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callState]);

    // Call Actions
    const callUser = async (targetId, targetName, targetRole, callType = 'audio') => {
        if (!socketRef.current || !socketRef.current.connected) {
            console.log('[CALL] Socket not connected. Reconnecting...');
            if (socketRef.current) {
                socketRef.current.connect();
            }
            Toast.show({
                type: 'error',
                text1: 'Connection Offline',
                text2: 'Server connection is offline. Reconnecting...'
            });
            return;
        }

        console.log(`[CALL] Calling ${targetName} (ID: ${targetId}, Type: ${callType})`);
        await requestCallPermissions();
        setCallState('dialing');
        setCallInfo({
            targetId,
            targetName,
            targetRole,
            callLogId: '',
            isCaller: true,
            callType
        });

        socketRef.current.emit('call-user', {
            targetId,
            offer: {}, // WebRTC offer (empty for simulated AV connection)
            callerName: user ? user.name : 'User',
            callerId: user ? user._id : '',
            callType
        });
        playSound('dialing');
    };

    const acceptCall = async () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Accepting call from:', callInfo.targetId);
        await requestCallPermissions();
        stopVibration();
        stopSound();
        setCallState('connected');
        socketRef.current.emit('accept-call', {
            callerId: callInfo.targetId,
            answer: {},
            callLogId: callInfo.callLogId
        });
    };

    const rejectCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Rejecting call from:', callInfo.targetId);
        stopVibration();
        socketRef.current.emit('reject-call', {
            callerId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('idle');
    };

    const endCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Ending call with:', callInfo.targetId);
        socketRef.current.emit('end-call', {
            targetId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('ended');
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <SocketContext.Provider value={{
            socket,
            onlineUsers,
            callState,
            callInfo,
            callDuration,
            callUser,
            acceptCall,
            rejectCall,
            endCall
        }}>
            {children}

            {/* Global Calling Overlay Modal */}
            <Modal
                visible={callState !== 'idle'}
                transparent={false}
                animationType="slide"
            >
                <View style={styles.callContainer}>
                    {/* Ringing/Connected Avatar Area or WebRTC Video WebView */}
                    {callState === 'connected' && callInfo.callType === 'video' ? (
                        <WebView
                            ref={webViewRef}
                            key={`webview-${callInfo.callLogId || 'default'}`}
                            source={{
                                uri: `https://meet.jit.si/lms-call-room-${callInfo.callLogId || 'default'}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true`
                            }}
                            style={styles.videoWebView}
                            mediaPlaybackRequiresUserAction={false}
                            allowsInlineMediaPlayback={true}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            databaseEnabled={true}
                            thirdPartyCookiesEnabled={true}
                            originWhitelist={['*']}
                            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            mediaCapturePermissionGrantType="grant"
                            injectedJavaScriptBeforeContentLoaded={debugInjection}
                            onMessage={handleWebViewMessage}
                            onPermissionRequest={(event) => {
                                event.grant(event.resources);
                            }}
                        />
                    ) : (
                        <View style={styles.topArea}>
                            <View style={[
                                styles.avatarContainer,
                                (callState === 'dialing' || callState === 'incoming') && styles.avatarPulse
                            ]}>
                                <View style={[
                                    styles.avatar,
                                    { backgroundColor: callInfo.targetRole === 'Teacher' ? colors.teacher : colors.student }
                                ]}>
                                    <Text style={styles.avatarText}>
                                        {callInfo.targetName?.[0]?.toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.targetName}>{callInfo.targetName}</Text>
                            <Text style={styles.statusText}>
                                {callState === 'dialing' && 'Calling...'}
                                {callState === 'incoming' && `Incoming ${callInfo.callType === 'video' ? 'Video' : 'Audio'} Call...`}
                                {callState === 'connected' && `Active ${callInfo.callType === 'video' ? 'Video' : 'Audio'} Call`}
                                {callState === 'offline' && 'Offline'}
                                {callState === 'declined' && 'Call Declined'}
                                {callState === 'ended' && 'Call Ended'}
                            </Text>
                            {callState === 'connected' && (
                                <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                            )}

                            {/* Hidden WebRTC Audio WebView for audio calls */}
                            {callState === 'connected' && callInfo.callType === 'audio' && (
                                <WebView
                                    ref={webViewRef}
                                    key={`webview-${callInfo.callLogId || 'default'}`}
                                    source={{
                                        uri: `https://meet.jit.si/lms-call-room-${callInfo.callLogId || 'default'}#config.startWithVideoMuted=true&config.startWithAudioMuted=false&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true`
                                    }}
                                    style={styles.hiddenWebView}
                                    mediaPlaybackRequiresUserAction={false}
                                    allowsInlineMediaPlayback={true}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    databaseEnabled={true}
                                    thirdPartyCookiesEnabled={true}
                                    originWhitelist={['*']}
                                    userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                                    mediaCapturePermissionGrantType="grant"
                                    injectedJavaScriptBeforeContentLoaded={debugInjection}
                                    onMessage={handleWebViewMessage}
                                    onPermissionRequest={(event) => {
                                        event.grant(event.resources);
                                    }}
                                />
                            )}
                        </View>
                    )}

                    {/* Collapsible Debug Panel */}
                    {callState === 'connected' && (
                        <View style={styles.debugPanel}>
                            <Text style={styles.debugTitle}>System Logs (Scroll to view):</Text>
                            <ScrollView style={styles.debugScroll} nestedScrollEnabled={true}>
                                {debugLogs.length === 0 ? (
                                    <Text style={[styles.debugText, { color: '#eab308' }]}>Waiting for logs from Jitsi WebRTC room...</Text>
                                ) : (
                                    debugLogs.map((log, idx) => (
                                        <Text key={idx} style={styles.debugText}>{log}</Text>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {/* Bottom Controls Area */}
                    <View style={styles.controlsArea}>
                        {callState === 'incoming' ? (
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.danger }]}
                                    onPress={rejectCall}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={32} color={colors.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.success }]}
                                    onPress={acceptCall}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="call" size={28} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.actionsRow}>
                                {callState === 'connected' && (
                                    <TouchableOpacity
                                        style={[styles.mutedBtnCircle, isMuted && { backgroundColor: colors.danger }]}
                                        onPress={toggleMute}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={isMuted ? "mic-off-outline" : "mic-outline"} size={24} color={colors.white} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.danger }]}
                                    onPress={endCall}
                                    activeOpacity={0.8}
                                    disabled={callState === 'ended' || callState === 'declined' || callState === 'offline'}
                                >
                                    <Ionicons name="close" size={32} color={colors.white} />
                                </TouchableOpacity>
                                {callState === 'connected' && (
                                    <TouchableOpacity
                                        style={[styles.mutedBtnCircle, !isSpeaker && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                                        onPress={toggleSpeaker}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={isSpeaker ? "volume-high-outline" : "volume-mute-outline"} size={24} color={colors.white} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);

const styles = StyleSheet.create({
    callContainer: {
        flex: 1,
        backgroundColor: '#0b141a', // WhatsApp dark green-black style
        justifyContent: 'space-between',
        paddingVertical: 60,
        alignItems: 'center',
    },
    topArea: {
        alignItems: 'center',
        marginTop: 60,
        gap: 16,
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    avatarPulse: {
        borderWidth: 1.5,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 54,
        fontWeight: '900',
        color: colors.white,
    },
    targetName: {
        fontSize: fontSizes.xxl + 2,
        fontWeight: '800',
        color: colors.white,
    },
    statusText: {
        fontSize: fontSizes.md,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
    },
    timerText: {
        fontSize: fontSizes.lg + 2,
        fontWeight: '700',
        color: colors.success,
        marginTop: 10,
        letterSpacing: 1,
    },
    controlsArea: {
        alignItems: 'center',
        width: '100%',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        width: '100%',
    },
    btnCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    mutedBtnCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1f2c34',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoWebView: {
        width: '100%',
        height: '75%',
        alignSelf: 'stretch',
        backgroundColor: '#0b141a',
    },
    hiddenWebView: {
        width: 1,
        height: 1,
        opacity: 0.01,
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
    debugPanel: {
        width: '90%',
        height: 120,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: borderRadius.md || 8,
        padding: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    debugTitle: {
        fontSize: 10,
        color: '#10b981',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    debugScroll: {
        flex: 1,
    },
    debugText: {
        fontSize: 9,
        color: '#ffffff',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
});
