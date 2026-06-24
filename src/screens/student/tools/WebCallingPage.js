import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    Share,
    ScrollView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';

// Base64 helper for uploading raw strings as files in React Native
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const btoa = (input) => {
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
         str.charAt(i | 0) || (map = '=', i % 1);
         output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
        charCode = str.charCodeAt(i += 3 / 4);
        if (charCode > 255) {
            throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
    }
    return output;
};

const WebCallingPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [callLogs, setCallLogs] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeSection, setActiveSection] = useState('call'); // 'call' | 'local_logs' | 'cloud_logs'

    // Call Simulation States
    const [callModalVisible, setCallModalVisible] = useState(false);
    const [callState, setCallState] = useState('idle'); // 'dialing' | 'connected' | 'ended'
    const [callTimer, setCallTimer] = useState(0);
    const [activeScenario, setActiveScenario] = useState(null);
    const [activeTeacherName, setActiveTeacherName] = useState('');
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [micMuted, setMicMuted] = useState(false);

    const callTimerRef = useRef(null);

    // AI Scenarios definitions
    const aiScenarios = {
        interviewer: {
            title: "AI Interviewer",
            description: "Practice behavioral and technical questions in a professional setting.",
            avatar: "👤",
            questions: [
                "Welcome to the mock interview. Let's start by introducing yourself.",
                "Why do you believe you are the right fit for this educational program?",
                "Can you describe a challenging learning scenario you faced and how you resolved it?",
                "How do you prioritize tasks when working under strict project deadlines?",
                "Thank you for answering. Do you have any questions for me?"
            ]
        },
        customer: {
            title: "Angry Customer Roleplay",
            description: "Practice handling escalations and de-escalating customer complaints.",
            avatar: "😡",
            questions: [
                "Hello? Finally someone picked up! I've been waiting for my order details for 3 days. What is going on?",
                "That's not good enough. Your system crashed and charged me twice. I need a refund immediately!",
                "If you can't process it right now, transfer me to your supervisor or manager. I don't want to waste more time.",
                "Fine. But I expect a confirmation email containing the details within 15 minutes. Can you do that?",
                "Thank you for helping. I appreciate your patience."
            ]
        },
        client: {
            title: "Business Client Negotiation",
            description: "Negotiate pricing plans, project scopes, and delivery deadlines.",
            avatar: "💼",
            questions: [
                "Hello, thank you for meeting with me today. Let's discuss the project budget.",
                "Your initial quote is about 20% higher than what we budgeted. Can we review options to lower it?",
                "If we extend the delivery deadline by 2 weeks, would you be able to provide a discount?",
                "Perfect. Let's draft a service agreement incorporating these terms. When can you send it over?",
                "Sounds like a deal. Talk to you soon."
            ]
        },
        support: {
            title: "Tech Support Simulation",
            description: "Resolve software setup problems and hardware configuration queries.",
            avatar: "🛠️",
            questions: [
                "Thank you for calling Technical Support. What error code are you currently experiencing?",
                "Okay, let's try power-cycling the device first. Have you restarted it in the last 15 minutes?",
                "Let's check the IP configuration next. Are you connected to the local network via Ethernet or Wi-Fi?",
                "I will push a configuration patch to your terminal now. Please check if the status light is green.",
                "Excellent. The system shows normal status. Let me know if there's anything else I can resolve."
            ]
        }
    };

    // Load list of teachers
    const loadTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const res = await axios.get('/calls/teachers');
            setTeachers(res.data || []);
        } catch (err) {
            console.error("Failed to load teachers list:", err);
            // Simulated fallback
            setTeachers([
                { _id: 't1', name: 'Dr. Sarah (Instructor)', email: 'sarah@lms.edu', callEnabled: true },
                { _id: 't2', name: 'Prof. James (Math Dept)', email: 'james@lms.edu', callEnabled: true },
                { _id: 't3', name: 'Alice Smith (CS Tutor)', email: 'alice@lms.edu', callEnabled: false }
            ]);
        } finally {
            setLoadingTeachers(false);
        }
    };

    // Load cloud logs
    const fetchCloudFiles = async () => {
        try {
            setLoadingLogs(true);
            const res = await axios.get('/practice-files');
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'web-calling');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud logs:", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Load local logs
    const loadLocalLogs = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_call_logs');
            if (saved) {
                setCallLogs(JSON.parse(saved));
            } else {
                // Initialize default dummy logs just like web does
                const defaults = [
                    { id: '1', name: 'Dr. Sarah (Instructor)', type: 'Voice Call', duration: '04:12', status: 'Completed', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), synced: false },
                    { id: '2', name: 'Mock AI Interviewer', type: 'Simulated Call', duration: '05:00', status: 'Completed', date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), synced: false }
                ];
                setCallLogs(defaults);
                await AsyncStorage.setItem('practice_call_logs', JSON.stringify(defaults));
            }
        } catch (err) {
            console.error("Failed to load local logs:", err);
        }
    };

    useEffect(() => {
        loadTeachers();
        loadLocalLogs();
        fetchCloudFiles();
    }, []);

    // Filter logs by dateParam
    const filteredLocalLogs = useMemo(() => {
        return callLogs.filter(log => parseDateToDdMmYyyy(log.date) === dateParam);
    }, [callLogs, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Timer handler
    useEffect(() => {
        if (callState === 'connected') {
            callTimerRef.current = setInterval(() => {
                setCallTimer(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setCallTimer(0);
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [callState]);

    // Start Call (Simulated)
    const handleStartCall = (partnerName, scenarioKey = null) => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Calling features are disabled in read-only previews.");
            return;
        }

        setCallModalVisible(true);
        setCallState('dialing');
        setMicMuted(false);
        
        if (scenarioKey) {
            setActiveScenario(aiScenarios[scenarioKey]);
            setActiveTeacherName('');
            setActiveQuestionIndex(0);
        } else {
            setActiveScenario(null);
            setActiveTeacherName(partnerName);
        }

        setTimeout(() => {
            setCallState('connected');
        }, 2000);
    };

    // End call
    const handleEndCall = async () => {
        setCallState('ended');
        
        const peerName = activeScenario ? `AI Partner (${activeScenario.title})` : activeTeacherName;
        const callType = activeScenario ? 'Simulated Call' : 'Voice Call';
        
        const newLog = {
            id: 'log_' + Date.now(),
            name: peerName,
            type: callType,
            duration: formatTime(callTimer),
            status: 'Completed',
            date: new Date().toISOString(),
            synced: false
        };

        const updatedLogs = [newLog, ...callLogs];
        setCallLogs(updatedLogs);
        await AsyncStorage.setItem('practice_call_logs', JSON.stringify(updatedLogs));

        setTimeout(() => {
            setCallState('idle');
            setCallModalVisible(false);
            Toast.show({
                type: 'success',
                text1: 'Call Logged',
                text2: 'Call log saved to local workspace!'
            });
        }, 1500);
    };

    // Next Prompt
    const handleNextQuestion = () => {
        if (!activeScenario) return;
        if (activeQuestionIndex < activeScenario.questions.length - 1) {
            setActiveQuestionIndex(prev => prev + 1);
        } else {
            Toast.show({
                type: 'info',
                text1: 'Finished',
                text2: 'AI Scenario finished. Ending call.'
            });
            handleEndCall();
        }
    };

    // Sync call logs
    const syncCallLogs = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalLogs.filter(log => !log.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local logs on this date are synced.");
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const logContent = `LMS CALL LOG\n====================\nName: ${item.name}\nType: ${item.type}\nDuration: ${item.duration}\nStatus: ${item.status}\nDate: ${new Date(item.date).toLocaleString()}`;
                const base64Content = btoa(logContent);

                const formData = new FormData();
                formData.append('file', {
                    uri: `data:text/plain;base64,${base64Content}`,
                    name: `call_log_${item.id}.txt`,
                    type: 'text/plain'
                });
                formData.append('toolType', 'web-calling');
                formData.append('duration', item.duration);
                formData.append('format', 'TXT');

                await axios.post('/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Failed to sync call log:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    Alert.alert("Storage Limit Exceeded", errMsg);
                    break;
                }
            }
        }

        await AsyncStorage.setItem('practice_call_logs', JSON.stringify(callLogs));
        await fetchCloudFiles();
        setUploading(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Synced ${successCount} log(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteLog = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this log from ${isCloud ? 'cloud' : 'local'}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (isCloud) {
                            try {
                                await axios.delete(`/practice-files/${id}`);
                                setCloudFiles(prev => prev.filter(f => f._id !== id));
                                Toast.show({
                                    type: 'success',
                                    text1: 'Deleted',
                                    text2: 'Call log deleted from cloud storage!'
                                });
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete log from cloud.");
                            }
                        } else {
                            const updated = callLogs.filter(log => log.id !== id);
                            setCallLogs(updated);
                            await AsyncStorage.setItem('practice_call_logs', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'Call log deleted from workspace!'
                            });
                        }
                    }
                }
            ]
        );
    };

    const shareFile = async (uri, filename) => {
        try {
            await Share.share({
                url: uri,
                title: filename
            });
        } catch (e) {
            console.warn(e);
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Web-Calling Tool"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Top Workspace Date indicator */}
            <View style={styles.workspaceHeader}>
                <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
            </View>

            {/* Section tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    onPress={() => setActiveSection('call')}
                    style={[styles.tabButton, activeSection === 'call' && styles.tabButtonActive]}
                >
                    <Ionicons name="call-outline" size={18} color={activeSection === 'call' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeSection === 'call' && styles.tabTextActive]}>
                        Call Directory
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveSection('local_logs')}
                    style={[styles.tabButton, activeSection === 'local_logs' && styles.tabButtonActive]}
                >
                    <Ionicons name="folder-open-outline" size={18} color={activeSection === 'local_logs' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeSection === 'local_logs' && styles.tabTextActive]}>
                        Local ({filteredLocalLogs.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveSection('cloud_logs')}
                    style={[styles.tabButton, activeSection === 'cloud_logs' && styles.tabButtonActive]}
                >
                    <Ionicons name="cloud-done-outline" size={18} color={activeSection === 'cloud_logs' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeSection === 'cloud_logs' && styles.tabTextActive]}>
                        Cloud ({filteredCloudFiles.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Call section */}
            {activeSection === 'call' && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Read only Warning */}
                    {isReadOnly && (
                        <View style={styles.readOnlyBox}>
                            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                            <Text style={styles.readOnlyText}>Calling is disabled in Read-Only previews.</Text>
                        </View>
                    )}

                    {/* AI scenarios */}
                    <Text style={styles.sectionHeader}>SIMULATED AI PARTNER SCENARIOS</Text>
                    <View style={styles.aiScenariosGrid}>
                        {Object.keys(aiScenarios).map((key) => {
                            const scenario = aiScenarios[key];
                            return (
                                <View key={key} style={styles.scenarioCard}>
                                    <View style={styles.scenarioAvatarRow}>
                                        <Text style={styles.scenarioAvatar}>{scenario.avatar}</Text>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                                            <Text style={styles.scenarioDesc}>{scenario.description}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => handleStartCall('', key)}
                                        style={styles.scenarioCallBtn}
                                    >
                                        <Ionicons name="mic-outline" size={16} color={colors.white} style={{ marginRight: 6 }} />
                                        <Text style={styles.scenarioCallBtnText}>Start Roleplay</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    {/* Teachers list */}
                    <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>TEACHERS DIRECTORY</Text>
                    {loadingTeachers ? (
                        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 10 }} />
                    ) : teachers.length === 0 ? (
                        <Text style={styles.emptyTextSub}>No teachers registered in directory.</Text>
                    ) : (
                        teachers.map((t) => (
                            <View key={t._id} style={styles.teacherItem}>
                                <View style={styles.teacherInfo}>
                                    <Text style={styles.teacherName}>{t.name}</Text>
                                    <Text style={styles.teacherEmail}>{t.email}</Text>
                                </View>
                                <View style={styles.teacherActions}>
                                    <TouchableOpacity
                                        onPress={() => handleStartCall(t.name)}
                                        style={styles.teacherCallBtn}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="call" size={16} color={colors.white} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Local Logs section */}
            {activeSection === 'local_logs' && (
                <View style={{ flex: 1 }}>
                    {!isReadOnly && filteredLocalLogs.some(l => !l.synced) && (
                        <TouchableOpacity
                            disabled={uploading}
                            onPress={syncCallLogs}
                            style={styles.syncBanner}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.syncText}>
                                {uploading ? 'Syncing call logs...' : 'Sync unsynced call logs to Cloud'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <FlatList
                        data={filteredLocalLogs}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="call-outline" size={48} color={colors.textMuted} />
                                <Text style={styles.emptyText}>No local call logs on this date.</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.logItem}>
                                <View style={styles.logIcon}>
                                    <Ionicons name="call-outline" size={24} color={colors.accent} />
                                </View>
                                <View style={styles.fileDetails}>
                                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.fileMeta}>
                                        <Text style={styles.metaText}>{item.type}</Text>
                                        <View style={styles.dot} />
                                        <Text style={styles.metaText}>{item.duration}</Text>
                                        <View style={styles.dot} />
                                        <Ionicons
                                            name={item.synced ? "cloud-done" : "cloud-offline"}
                                            size={14}
                                            color={item.synced ? colors.success : colors.warning}
                                        />
                                    </View>
                                </View>
                                {!isReadOnly && (
                                    <TouchableOpacity onPress={() => deleteLog(item.id, false)} style={styles.actionButton}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />
                </View>
            )}

            {/* Cloud Logs section */}
            {activeSection === 'cloud_logs' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.spaceUsageContainer}>
                        <View style={styles.spaceRow}>
                            <Text style={styles.spaceText}>Cloud Storage Space</Text>
                            <Text style={styles.spaceValue}>
                                {(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / {(cloudSpace.limit / (1024 * 1024)).toFixed(0)}MB
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }]} />
                        </View>
                    </View>

                    {loadingLogs ? (
                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={filteredCloudFiles}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
                                    <Text style={styles.emptyText}>No cloud call logs on this date.</Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const fileUrl = `${axios.defaults.baseURL.replace('/api', '')}${item.fileUrl}`;
                                return (
                                    <View style={styles.logItem}>
                                        <View style={[styles.logIcon, { backgroundColor: '#fdf2f8' }]}>
                                            <Ionicons name="document-text-outline" size={24} color="#ec4899" />
                                        </View>
                                        <View style={styles.fileDetails}>
                                            <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
                                            <View style={styles.fileMeta}>
                                                <Text style={styles.metaText}>Duration: {item.metadata?.duration || '00:00'}</Text>
                                                <View style={styles.dot} />
                                                <Text style={styles.metaText}>{(item.size / 1024).toFixed(1)} KB</Text>
                                            </View>
                                        </View>
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity onPress={() => shareFile(fileUrl, item.filename)} style={styles.actionButton}>
                                                <Ionicons name="share-social-outline" size={20} color={colors.accent} />
                                            </TouchableOpacity>
                                            {!isReadOnly && (
                                                <TouchableOpacity onPress={() => deleteLog(item._id, true)} style={styles.actionButton}>
                                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            )}

            {/* CALL MODAL (Simulated Calling Screen) */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={callModalVisible}
                onRequestClose={() => {
                    if (callState !== 'ended') {
                        handleEndCall();
                    } else {
                        setCallModalVisible(false);
                    }
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.activeCallLabel}>
                            {activeScenario ? 'ACTIVE AI ROLEPLAY SESSION' : 'TEACHER CALL'}
                        </Text>
                        <Text style={styles.timerText}>
                            {callState === 'connected' ? formatTime(callTimer) : callState === 'dialing' ? 'Dialing...' : 'Call Ended'}
                        </Text>
                    </View>

                    {/* Avatar & Dialogue Prompts */}
                    <View style={styles.callContent}>
                        <View style={styles.callAvatarCircle}>
                            <Text style={styles.callAvatarText}>
                                {activeScenario ? activeScenario.avatar : '👤'}
                            </Text>
                        </View>
                        <Text style={styles.callPartnerName}>
                            {activeScenario ? activeScenario.title : activeTeacherName}
                        </Text>

                        {/* Dialogue bubble for AI scenarios */}
                        {callState === 'connected' && activeScenario && (
                            <View style={styles.promptBubble}>
                                <Text style={styles.promptBubbleLabel}>AI SCENARIO DIALOGUE:</Text>
                                <Text style={styles.promptText}>
                                    "{activeScenario.questions[activeQuestionIndex]}"
                                </Text>
                            </View>
                        )}

                        {callState === 'dialing' && (
                            <Text style={styles.callingStateText}>Ringing...</Text>
                        )}
                        {callState === 'ended' && (
                            <Text style={styles.callingStateText}>Disconnecting line...</Text>
                        )}
                    </View>

                    {/* Action buttons footer */}
                    <View style={styles.modalFooter}>
                        {callState === 'connected' && activeScenario && (
                            <TouchableOpacity
                                onPress={handleNextQuestion}
                                style={styles.nextPromptBtn}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.nextPromptBtnText}>
                                    {activeQuestionIndex < activeScenario.questions.length - 1 ? 'Next Prompt' : 'Finish Session'}
                                </Text>
                                <Ionicons name="arrow-forward" size={16} color={colors.white} />
                            </TouchableOpacity>
                        )}

                        <View style={styles.controlsRow}>
                            <TouchableOpacity
                                onPress={() => setMicMuted(!micMuted)}
                                style={[styles.muteBtn, micMuted && styles.muteBtnActive]}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={micMuted ? "mic-off" : "mic"}
                                    size={24}
                                    color={micMuted ? colors.white : colors.textSecondary}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleEndCall}
                                style={styles.hangupBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={28} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg
    },
    workspaceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        backgroundColor: '#eef2ff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    workspaceText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '800',
        color: colors.accent
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    tabButtonActive: {
        borderBottomColor: colors.accent
    },
    tabText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '700',
        color: colors.textSecondary
    },
    tabTextActive: {
        color: colors.accent
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 40
    },
    readOnlyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        padding: 10,
        marginBottom: spacing.md
    },
    readOnlyText: {
        fontSize: fontSizes.xs,
        color: '#b45309',
        fontWeight: '700'
    },
    sectionHeader: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '900',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        letterSpacing: 1
    },
    aiScenariosGrid: {
        gap: spacing.md
    },
    scenarioCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border
    },
    scenarioAvatarRow: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    scenarioAvatar: {
        fontSize: 32,
        backgroundColor: colors.bgSecondary,
        padding: 8,
        borderRadius: borderRadius.md,
        overflow: 'hidden'
    },
    scenarioTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text
    },
    scenarioDesc: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        marginTop: 2,
        lineHeight: 16
    },
    scenarioCallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ec4899',
        borderRadius: borderRadius.md,
        paddingVertical: 8,
        marginTop: 12
    },
    scenarioCallBtnText: {
        color: colors.white,
        fontSize: fontSizes.xs + 1,
        fontWeight: '800'
    },
    teacherItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border
    },
    teacherInfo: {
        flex: 1
    },
    teacherName: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text
    },
    teacherEmail: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        marginTop: 2
    },
    teacherCallBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center'
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success,
        paddingVertical: 10
    },
    syncText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '800'
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 40
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80
    },
    emptyText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 10
    },
    emptyTextSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '500',
        textAlign: 'center',
        marginVertical: 10
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border
    },
    logIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    fileDetails: {
        flex: 1
    },
    fileName: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2
    },
    fileMeta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    metaText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '500'
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.textMuted,
        marginHorizontal: 6
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    actionButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: colors.bgSecondary
    },
    spaceUsageContainer: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    spaceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    spaceText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.textSecondary
    },
    spaceValue: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.text
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.bgSecondary,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent
    },

    // Simulated Call styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: spacing.lg,
        justifyContent: 'space-between'
    },
    modalHeader: {
        alignItems: 'center',
        marginTop: 20
    },
    activeCallLabel: {
        color: '#f472b6',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8
    },
    timerText: {
        color: colors.white,
        fontSize: 24,
        fontWeight: '800'
    },
    callContent: {
        alignItems: 'center',
        marginVertical: 40
    },
    callAvatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#f472b6'
    },
    callAvatarText: {
        fontSize: 48
    },
    callPartnerName: {
        color: colors.white,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 30
    },
    callingStateText: {
        color: '#f472b6',
        fontSize: fontSizes.sm,
        fontWeight: '700',
        marginTop: 10
    },
    promptBubble: {
        backgroundColor: '#1e293b',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        width: '100%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    promptBubbleLabel: {
        color: '#f472b6',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 6
    },
    promptText: {
        color: colors.white,
        fontSize: fontSizes.md,
        lineHeight: 22,
        fontWeight: '600',
        textAlign: 'center'
    },
    modalFooter: {
        marginBottom: 20,
        alignItems: 'center'
    },
    nextPromptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: borderRadius.full,
        marginBottom: 24,
        gap: 6
    },
    nextPromptBtnText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '800'
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32
    },
    muteBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center'
    },
    muteBtnActive: {
        backgroundColor: colors.danger
    },
    hangupBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '135deg' }]
    }
});

export default WebCallingPage;
