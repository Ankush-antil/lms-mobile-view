import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const TeacherDashboard = ({ navigation }) => {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Call and Chat States
    const [activeContact, setActiveContact] = useState(null);
    const [contactType, setContactType] = useState(null); // 'chat' | 'audio' | 'videocam' | null
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [callState, setCallState] = useState('ringing'); // 'ringing' | 'connected'
    const [callTimer, setCallTimer] = useState(0);

    // Call connected timer
    useEffect(() => {
        let interval;
        if (contactType && (contactType === 'audio' || contactType === 'videocam') && callState === 'connected') {
            interval = setInterval(() => {
                setCallTimer(prev => prev + 1);
            }, 1000);
        } else {
            setCallTimer(0);
        }
        return () => clearInterval(interval);
    }, [contactType, callState]);

    // Ringing state timer (auto connects in 2 seconds)
    useEffect(() => {
        let timeout;
        if (contactType && (contactType === 'audio' || contactType === 'videocam') && callState === 'ringing') {
            timeout = setTimeout(() => {
                setCallState('connected');
            }, 2000);
        }
        return () => clearTimeout(timeout);
    }, [contactType, callState]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSendMsg = () => {
        if (!chatInput.trim()) return;
        const newMsg = {
            id: Date.now().toString(),
            sender: 'Teacher',
            text: chatInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, newMsg]);
        const typed = chatInput;
        setChatInput('');

        setTimeout(() => {
            let replyText = "Yes sir, I am working on the assignments.";
            if (typed.toLowerCase().includes('hello') || typed.toLowerCase().includes('hi')) {
                replyText = "Hello Sir! How can I help you today?";
            } else if (typed.toLowerCase().includes('test') || typed.toLowerCase().includes('exam')) {
                replyText = "Sir, I have prepared for the test. When is the deadline?";
            } else if (typed.toLowerCase().includes('call')) {
                replyText = "Sure sir, you can call me anytime.";
            }

            setChatMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'Student',
                text: replyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1500);
    };

    const fetchData = async () => {
        try {
            const [profileRes, studentsRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/users/teacher-students').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            setStudents(studentsRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    const firstName = profile?.name?.split(' ')[0] || 'Teacher';

    return (
        <View style={styles.container}>
            <AppHeader title="Teacher Dashboard" rightIcon="log-out-outline" rightAction={logout} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.teacher} />}
            >
                {/* Welcome */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.welcomeLeft}>
                        <Text style={styles.welcomeGreeting}>Welcome, {firstName}! 👨‍🏫</Text>
                        <Text style={styles.welcomeSub}>Manage your students & activities</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.teacher }]}>
                        <Text style={styles.avatarText}>{profile?.name?.[0] || 'T'}</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <StatCard
                        title="My Students"
                        value={students.length}
                        icon="people"
                        color={colors.teacher}
                        bg="#ecfdf5"
                    />
                    <StatCard
                        title="Activities"
                        value="–"
                        icon="clipboard"
                        color={colors.accent}
                        bg="#eef2ff"
                    />
                </View>

                {/* Quick Actions */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('TeacherActivities')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#eef2ff' }]}>
                                <Ionicons name="clipboard-outline" size={22} color={colors.accent} />
                            </View>
                            <Text style={styles.actionLabel}>Activities</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('EvaluatePage')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                                <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.teacher} />
                            </View>
                            <Text style={styles.actionLabel}>Evaluate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('Profile')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                                <Ionicons name="person-outline" size={22} color={colors.warning} />
                            </View>
                            <Text style={styles.actionLabel}>Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('ContactStudents')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#e6f4ea' }]}>
                                <Ionicons name="chatbubbles-outline" size={22} color={colors.teacher} />
                            </View>
                            <Text style={styles.actionLabel}>Contact Students</Text>
                        </TouchableOpacity>
                    </View>
                </SectionCard>

                {/* My Students */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>My Students ({students.length})</Text>
                    {students.length > 0 ? students.slice(0, 5).map(student => (
                        <View key={student._id} style={styles.studentItem}>
                            <View style={[styles.studentAvatar, { backgroundColor: colors.teacher }]}>
                                <Text style={styles.studentAvatarText}>{student.name?.[0]}</Text>
                            </View>
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentEmail}>{student.email}</Text>
                            </View>
                            <View style={styles.contactActions}>
                                <TouchableOpacity 
                                    style={[styles.contactCircleBtn, { backgroundColor: '#eef2ff' }]}
                                    onPress={() => {
                                        setActiveContact(student);
                                        setContactType('chat');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.contactCircleBtn, { backgroundColor: '#ecfdf5' }]}
                                    onPress={() => {
                                        setActiveContact(student);
                                        setContactType('audio');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="call" size={16} color={colors.teacher} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.contactCircleBtn, { backgroundColor: '#fff7ed' }]}
                                    onPress={() => {
                                        setActiveContact(student);
                                        setContactType('videocam');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="videocam" size={16} color="#f97316" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )) : (
                        <EmptyState icon="people-outline" title="No students assigned" />
                    )}
                </SectionCard>

                {/* Profile Card */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>My Profile</Text>
                    <View style={styles.profileRow}>
                        <View style={[styles.profileAvatar, { backgroundColor: colors.teacher }]}>
                            <Text style={styles.profileAvatarText}>{profile?.name?.[0]}</Text>
                        </View>
                        <View>
                            <Text style={styles.profileName}>{profile?.name}</Text>
                            <Text style={styles.profileEmail}>{profile?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.profileMeta}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Subject</Text>
                            <Text style={styles.metaValue}>
                                {profile?.teacherProfile?.subjects?.join(', ') || profile?.teacherProfile?.subject || 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Institute</Text>
                            <Text style={styles.metaValue}>{profile?.institute?.name || 'N/A'}</Text>
                        </View>
                    </View>
                </SectionCard>
            </ScrollView>

            {/* Calling Modal (Audio/Video) */}
            <Modal
                visible={contactType === 'audio' || contactType === 'videocam'}
                animationType="slide"
                transparent={false}
                onRequestClose={() => {
                    setContactType(null);
                    setCallState('ringing');
                }}
            >
                <View style={styles.callContainer}>
                    {contactType === 'videocam' && callState === 'connected' ? (
                        <View style={styles.videoGrid}>
                            <View style={styles.remoteVideo}>
                                <View style={styles.videoAvatarContainer}>
                                    <View style={[styles.largeAvatar, { backgroundColor: colors.teacher }]}>
                                        <Text style={styles.largeAvatarText}>{activeContact?.name?.[0]}</Text>
                                    </View>
                                    <Text style={styles.videoNameText}>{activeContact?.name}</Text>
                                    <Text style={styles.videoStatusText}>Video Streaming...</Text>
                                </View>
                            </View>
                            <View style={styles.localVideoFloating}>
                                <View style={styles.pipAvatar}>
                                    <Text style={styles.pipAvatarText}>{profile?.name?.[0]}</Text>
                                </View>
                                <Text style={styles.pipLabel}>You</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.audioCallContent}>
                            <View style={[styles.ringingAvatarContainer, callState === 'ringing' && styles.ringingPulsate]}>
                                <View style={[styles.hugeAvatar, { backgroundColor: colors.teacher }]}>
                                    <Text style={styles.hugeAvatarText}>{activeContact?.name?.[0]}</Text>
                                </View>
                            </View>
                            <Text style={styles.callName}>{activeContact?.name}</Text>
                            <Text style={styles.callStateText}>
                                {callState === 'ringing' 
                                    ? `Ringing (${contactType === 'audio' ? 'Audio' : 'Video'})...` 
                                    : `Active Call (${contactType === 'audio' ? 'Audio' : 'Video'})`}
                            </Text>
                        </View>
                    )}

                    <View style={styles.callControlsContainer}>
                        {callState === 'connected' && (
                            <Text style={styles.timerText}>{formatTime(callTimer)}</Text>
                        )}
                        <View style={styles.controlButtonsRow}>
                            <TouchableOpacity style={styles.iconControlCircle} activeOpacity={0.7}>
                                <Ionicons name="mic-off-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.iconControlCircle, { backgroundColor: colors.danger }]}
                                onPress={() => {
                                    setContactType(null);
                                    setCallState('ringing');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={28} color={colors.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconControlCircle} activeOpacity={0.7}>
                                <Ionicons name="volume-high-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Chat Modal */}
            <Modal
                visible={contactType === 'chat'}
                animationType="slide"
                transparent
                onRequestClose={() => {
                    setContactType(null);
                    setChatMessages([]);
                }}
            >
                <KeyboardAvoidingView 
                    style={styles.chatOverlay} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.chatSheet}>
                        <View style={styles.chatHeader}>
                            <View style={styles.chatHeaderLeft}>
                                <View style={[styles.chatAvatar, { backgroundColor: colors.teacher }]}>
                                    <Text style={styles.chatAvatarText}>{activeContact?.name?.[0]}</Text>
                                </View>
                                <View>
                                    <Text style={styles.chatHeaderTitle}>{activeContact?.name}</Text>
                                    <Text style={styles.chatHeaderStatus}>Online</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    setContactType(null);
                                    setChatMessages([]);
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.chatMessagesContainer}
                            contentContainerStyle={styles.chatMessagesContent}
                            ref={ref => ref?.scrollToEnd({ animated: true })}
                        >
                            {chatMessages.length === 0 ? (
                                <View style={styles.emptyChatContainer}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                                    <Text style={styles.emptyChatText}>No messages yet</Text>
                                    <Text style={styles.emptyChatSub}>Start a conversation with {activeContact?.name}</Text>
                                </View>
                            ) : (
                                chatMessages.map((msg) => {
                                    const isTeacher = msg.sender === 'Teacher';
                                    return (
                                        <View 
                                            key={msg.id} 
                                            style={[
                                                styles.msgWrapper, 
                                                isTeacher ? styles.msgWrapperTeacher : styles.msgWrapperStudent
                                            ]}
                                        >
                                            <View 
                                                style={[
                                                    styles.msgBubble, 
                                                    isTeacher ? styles.msgBubbleTeacher : styles.msgBubbleStudent
                                                ]}
                                            >
                                                <Text style={isTeacher ? styles.msgTextTeacher : styles.msgTextStudent}>
                                                    {msg.text}
                                                </Text>
                                            </View>
                                            <Text style={styles.msgTime}>{msg.time}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={styles.chatInputBar}>
                            <TextInput
                                style={styles.chatTextInput}
                                placeholder="Type a message..."
                                placeholderTextColor={colors.textMuted}
                                value={chatInput}
                                onChangeText={setChatInput}
                            />
                            <TouchableOpacity 
                                style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.6 }]}
                                onPress={handleSendMsg}
                                disabled={!chatInput.trim()}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="send" size={16} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 32 },
    welcomeBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    welcomeLeft: {},
    welcomeGreeting: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
    },
    welcomeSub: { fontSize: fontSizes.sm, color: colors.textMuted },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionBtn: { alignItems: 'center', gap: spacing.xs },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    studentAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    studentAvatarText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.white },
    studentInfo: { flex: 1 },
    studentName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    studentEmail: { fontSize: fontSizes.xs, color: colors.textMuted },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    profileAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    profileName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
    profileEmail: { fontSize: fontSizes.sm, color: colors.textMuted },
    profileMeta: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    metaItem: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
    },
    metaLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
    metaValue: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginTop: 2 },
    contactActions: {
        flexDirection: 'row',
        gap: 6,
    },
    contactCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    // Calling Screen Styles
    callContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'space-between',
        paddingVertical: 50,
        alignItems: 'center',
    },
    audioCallContent: {
        alignItems: 'center',
        marginTop: 100,
        gap: 16,
    },
    ringingAvatarContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    ringingPulsate: {
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    hugeAvatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hugeAvatarText: {
        fontSize: 48,
        fontWeight: '900',
        color: colors.white,
    },
    callName: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
        marginTop: 10,
    },
    callStateText: {
        fontSize: fontSizes.sm,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    videoGrid: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    remoteVideo: {
        flex: 1,
        width: '100%',
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoAvatarContainer: {
        alignItems: 'center',
        gap: 8,
    },
    largeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeAvatarText: {
        fontSize: 38,
        fontWeight: '950',
        color: colors.white,
    },
    videoNameText: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.white,
    },
    videoStatusText: {
        fontSize: fontSizes.xs,
        color: '#10b981',
        fontWeight: '700',
    },
    localVideoFloating: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 100,
        height: 140,
        backgroundColor: '#334155',
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 4,
    },
    pipAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.teacher,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pipAvatarText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },
    pipLabel: {
        fontSize: fontSizes.xs - 2,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '700',
    },
    callControlsContainer: {
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    timerText: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 1,
    },
    controlButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        width: '100%',
    },
    iconControlCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    // Chat Overlay Styles
    chatOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    chatSheet: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    chatHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    chatAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatAvatarText: {
        fontSize: fontSizes.sm,
        fontWeight: '850',
        color: colors.white,
    },
    chatHeaderTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    chatHeaderStatus: {
        fontSize: fontSizes.xs - 2,
        color: colors.success,
        fontWeight: '700',
    },
    chatMessagesContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    chatMessagesContent: {
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    emptyChatContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: spacing.xs,
    },
    emptyChatText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    emptyChatSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        textAlign: 'center',
    },
    msgWrapper: {
        maxWidth: '80%',
        marginBottom: 4,
    },
    msgWrapperTeacher: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    msgWrapperStudent: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    msgBubble: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    msgBubbleTeacher: {
        backgroundColor: colors.accent,
        borderTopRightRadius: 4,
    },
    msgBubbleStudent: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderTopLeftRadius: 4,
    },
    msgTextTeacher: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '600',
    },
    msgTextStudent: {
        color: colors.text,
        fontSize: fontSizes.sm,
        fontWeight: '600',
    },
    msgTime: {
        fontSize: 9,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '500',
    },
    chatInputBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingTop: 8,
        gap: 8,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    chatTextInput: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 44,
        fontSize: fontSizes.sm,
        color: colors.text,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    chatSendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TeacherDashboard;
