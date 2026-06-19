import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ContactStudents = ({ navigation }) => {
    const { user } = useAuth();
    const { callUser, onlineUsers } = useSocket();
    const [profile, setProfile] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Call and Chat States
    const [activeContact, setActiveContact] = useState(null);
    const [contactType, setContactType] = useState(null); // 'chat' | 'audio' | 'videocam' | null
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');


    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Fetch profile and students
    const fetchData = async () => {
        try {
            const [profileRes, studentsRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/users/teacher-students').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            
            // Map students and attach mock call history entries to look like WhatsApp Call Log
            const mockLogs = [
                { type: 'incoming', time: 'Today, 11:32 am', icon: 'arrow-down-left', color: '#10b981', isVideo: true },
                { type: 'outgoing', time: 'Yesterday, 9:09 am', icon: 'arrow-up-right', color: '#10b981', isVideo: false },
                { type: 'missed', time: '17 June, 7:41 am', icon: 'arrow-down-left', color: colors.danger, isVideo: true },
                { type: 'incoming', time: '14 June, 11:02 pm', icon: 'arrow-down-left', color: '#10b981', isVideo: false },
                { type: 'outgoing', time: '13 June, 5:50 pm', icon: 'arrow-up-right', color: '#10b981', isVideo: true }
            ];

            const mappedStudents = (studentsRes.data || []).map((student, idx) => {
                const log = mockLogs[idx % mockLogs.length];
                return {
                    ...student,
                    logTime: log.time,
                    logIcon: log.icon,
                    logIconColor: log.color,
                    isVideo: log.isVideo,
                    logType: log.type
                };
            });
            setStudents(mappedStudents);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);



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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.teacher} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Custom WhatsApp style header with togglable search */}
            {showSearch ? (
                <View style={styles.waHeader}>
                    <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.waSearchInput}
                        placeholder="Search students..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} style={{ padding: 4 }}>
                            <Ionicons name="close" size={22} color={colors.white} />
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={styles.waHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.waHeaderTitle}>Calls</Text>
                    <View style={styles.waHeaderRight}>
                        <TouchableOpacity onPress={() => setShowSearch(true)} activeOpacity={0.7} style={styles.headerIconBtn}>
                            <Ionicons name="search" size={22} color={colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.7} style={styles.headerIconBtn}>
                            <Ionicons name="ellipsis-vertical" size={22} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent</Text>
            </View>

            <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => { setRefreshing(true); fetchData(); }} 
                        tintColor={colors.teacher} 
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={54} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No Students Found</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.waItemRow}
                        onPress={() => {
                            setActiveContact(item);
                            setContactType('chat');
                        }}
                        activeOpacity={0.8}
                    >
                        {/* Student Avatar with Online Indicator */}
                        <View style={{ position: 'relative' }}>
                            <View style={[styles.waAvatar, { backgroundColor: colors.teacher }]}>
                                <Text style={styles.waAvatarText}>{item.name?.[0] || 'S'}</Text>
                            </View>
                            {onlineUsers?.includes(item._id) && (
                                <View style={styles.onlineIndicator} />
                            )}
                        </View>

                        {/* Student Call Logs Details */}
                        <View style={styles.waDetails}>
                            <Text style={styles.waName}>{item.name}</Text>
                            <View style={styles.waStatusRow}>
                                <Ionicons name={item.logIcon} size={14} color={item.logIconColor} style={{ marginRight: 4 }} />
                                <Text style={styles.waLogTime}>{item.logTime}</Text>
                            </View>
                        </View>

                        {/* WhatsApp right side Chat/Audio/Video Actions */}
                        <View style={styles.waActionsRow}>
                            <TouchableOpacity 
                                style={styles.waActionBtn}
                                onPress={() => {
                                    setActiveContact(item);
                                    setContactType('chat');
                                }}
                                activeOpacity={0.75}
                            >
                                <Ionicons 
                                    name="chatbubble-ellipses-outline" 
                                    size={22} 
                                    color={colors.teacher} 
                                />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.waActionBtn}
                                onPress={() => {
                                    callUser(item._id, item.name, 'Student', 'audio');
                                }}
                                activeOpacity={0.75}
                            >
                                <Ionicons 
                                    name="call-outline" 
                                    size={22} 
                                    color={colors.teacher} 
                                />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.waActionBtn}
                                onPress={() => {
                                    callUser(item._id, item.name, 'Student', 'video');
                                }}
                                activeOpacity={0.75}
                            >
                                <Ionicons 
                                    name="videocam-outline" 
                                    size={22} 
                                    color={colors.teacher} 
                                />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
            />



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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    // WhatsApp style dark green header
    waHeader: {
        backgroundColor: '#075e54',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 42 : 50,
        paddingBottom: 14,
        paddingHorizontal: spacing.md,
        justifyContent: 'space-between',
        elevation: 4,
    },
    waSearchInput: {
        flex: 1,
        color: colors.white,
        fontSize: fontSizes.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        marginLeft: 10,
    },
    waHeaderTitle: {
        fontSize: fontSizes.lg + 2,
        fontWeight: '700',
        color: colors.white,
        flex: 1,
        marginLeft: 18,
    },
    waHeaderRight: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    headerIconBtn: {
        padding: 2,
    },
    waActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    recentSection: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: 8,
    },
    recentTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: 30,
    },
    waItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    waAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    waAvatarText: {
        fontSize: fontSizes.md + 2,
        fontWeight: '800',
        color: colors.white,
    },
    waDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    waName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    waStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    waLogTime: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
    },
    waActions: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    waActionBtn: {
        padding: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 150,
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: fontSizes.md,
        color: colors.textMuted,
        fontWeight: '700',
    },

    // Calling Overlays
    callContainer: {
        flex: 1,
        backgroundColor: '#0b141a', // WA dark call background
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
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    ringingPulsate: {
        borderWidth: 1.5,
        borderColor: 'rgba(18, 140, 126, 0.5)',
    },
    hugeAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hugeAvatarText: {
        fontSize: 54,
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
        backgroundColor: '#0e171e',
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
        color: '#128c7e',
        fontWeight: '700',
    },
    localVideoFloating: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 100,
        height: 140,
        backgroundColor: '#1d2a32',
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1f2c34',
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
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 14,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.success || '#10b981',
        borderWidth: 2,
        borderColor: colors.bg || '#ffffff',
    },
});

export default ContactStudents;
