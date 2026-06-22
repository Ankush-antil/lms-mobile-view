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
    ScrollView,
    Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ContactStudents = ({ navigation }) => {
    const { user } = useAuth();
    const { callUser, onlineUsers, socket } = useSocket();
    const chatScrollViewRef = React.useRef(null);
    
    const showCallingComingSoon = () => {
        Alert.alert('Coming Soon', 'Audio and Video calling features are coming soon.');
    };
    const [profile, setProfile] = useState(null);
    const [students, setStudents] = useState([]);
    const [callHistory, setCallHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'recents'
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
    const [editingMessage, setEditingMessage] = useState(null);

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredHistory = callHistory.filter(log => {
        const peer = log.caller?._id === user?._id ? log.receiver : log.caller;
        const peerName = peer?.name || log.guestName || 'Unknown Student';
        return peerName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Fetch profile, students, and call history
    const fetchData = async () => {
        try {
            const [profileRes, studentsRes, historyRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/users/teacher-students').catch(() => ({ data: [] })),
                axios.get('/calls/history').catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setStudents(studentsRes.data || []);
            setCallHistory(historyRes.data || []);
        } catch (e) {
            console.error('[CONTACTS] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        try {
            await axios.delete(`/calls/history/${logId}`);
            setCallHistory(prev => prev.filter(log => log._id !== logId));
        } catch (e) {
            console.error('[CONTACTS] Delete log error:', e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openChat = async (contact) => {
        setActiveContact(contact);
        setContactType('chat');
        try {
            const historyRes = await axios.get(`/messages/${contact._id}`);
            setChatMessages(historyRes.data || []);
            // Mark as read
            await axios.put(`/messages/${contact._id}/read`);
            // Refresh main lists
            fetchData();
        } catch (e) {
            console.error('[CHAT] Error opening chat history:', e);
        }
    };

    // Listen for real-time messages via socket
    useEffect(() => {
        if (socket) {
            const handleNewMessage = (msg) => {
                const isMsgFromActive = activeContact && 
                    (msg.sender?._id === activeContact._id || msg.sender === activeContact._id);
                
                if (isMsgFromActive) {
                    setChatMessages(prev => [...prev, msg]);
                    // Mark as read
                    axios.put(`/messages/${activeContact._id}/read`).catch(() => {});
                } else {
                    // Refresh data to show unread badges / latest messages
                    fetchData();
                }
            };

            const handleMessageSent = (msg) => {
                const isMsgForActive = activeContact && 
                    (msg.receiver?._id === activeContact._id || msg.receiver === activeContact._id);
                
                if (isMsgForActive) {
                    setChatMessages(prev => [...prev, msg]);
                }
            };

            const handleMessageEdited = (msg) => {
                const isMsgFromActive = activeContact && 
                    (msg.sender?._id === activeContact._id || msg.sender === activeContact._id ||
                     msg.receiver?._id === activeContact._id || msg.receiver === activeContact._id);
                
                if (isMsgFromActive) {
                    setChatMessages(prev => prev.map(m => m._id === msg._id ? msg : m));
                }
            };

            socket.on('new-message', handleNewMessage);
            socket.on('message-sent', handleMessageSent);
            socket.on('message-edited', handleMessageEdited);

            return () => {
                socket.off('new-message', handleNewMessage);
                socket.off('message-sent', handleMessageSent);
                socket.off('message-edited', handleMessageEdited);
            };
        }
    }, [socket, activeContact]);

    const handleLongPressMsg = (msg) => {
        const isSelf = msg.sender?._id === user?._id || msg.sender === user?._id;
        if (!isSelf) return;

        Alert.alert(
            'Message Options',
            'Choose an action',
            [
                {
                    text: 'Edit Message',
                    onPress: () => {
                        setEditingMessage(msg);
                        setChatInput(msg.text);
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const handleSendMsg = () => {
        if (!chatInput.trim() || !activeContact) return;
        
        if (socket && socket.connected) {
            if (editingMessage) {
                socket.emit('edit-message', {
                    messageId: editingMessage._id,
                    newText: chatInput.trim()
                });
                setEditingMessage(null);
            } else {
                socket.emit('send-message', {
                    receiverId: activeContact._id,
                    text: chatInput.trim()
                });
            }
            setChatInput('');
        } else {
            console.warn('[CHAT] Socket offline. Unable to send real-time message.');
        }
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
                        placeholder="Search..."
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
                    <Text style={styles.waHeaderTitle}>{activeTab === 'contacts' ? 'Students' : 'Calls'}</Text>
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

            {/* Segment Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'contacts' && styles.activeTabButton]}
                    onPress={() => setActiveTab('contacts')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>Students</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'recents' && styles.activeTabButton]}
                    onPress={() => setActiveTab('recents')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'recents' && styles.activeTabText]}>Recent Calls</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeTab === 'recents' ? filteredHistory : filteredStudents}
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
                    activeTab === 'recents' ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="call-outline" size={54} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No Recent Calls</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={54} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No Students Found</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => {
                    if (activeTab === 'recents') {
                        const isCaller = item.caller?._id === user?._id;
                        const peer = isCaller ? item.receiver : item.caller;
                        const peerName = peer?.name || item.guestName || 'Unknown Student';
                        const peerRole = peer?.role || 'Student';
                        
                        let logIcon = 'arrow-down-left';
                        let logIconColor = '#10b981';
                        if (isCaller) {
                            logIcon = 'arrow-up-right';
                            logIconColor = '#10b981';
                        } else if (item.status === 'missed') {
                            logIcon = 'arrow-down-left';
                            logIconColor = colors.danger;
                        }

                        const formatLogTime = (dateStr) => {
                            try {
                                const d = new Date(dateStr);
                                return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            } catch (e) {
                                return dateStr;
                            }
                        };

                        return (
                            <View style={styles.waItemRow}>
                                <View style={[styles.waAvatar, { backgroundColor: colors.teacher }]}>
                                    <Text style={styles.waAvatarText}>{peerName?.[0]?.toUpperCase() || 'S'}</Text>
                                </View>

                                <View style={styles.waDetails}>
                                    <Text style={styles.waName}>{peerName}</Text>
                                    <View style={styles.waStatusRow}>
                                        <Ionicons name={logIcon} size={14} color={logIconColor} style={{ marginRight: 4 }} />
                                        <Text style={styles.waLogTime}>{formatLogTime(item.createdAt)}</Text>
                                        <Text style={[styles.statusBadge, { color: item.status === 'missed' ? colors.danger : colors.success }]}>
                                            {` • ${item.status}`}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.waActionsRow}>
                                    {peer?._id && (
                                        <TouchableOpacity 
                                            style={[styles.waActionBtn, { marginRight: 8 }]}
                                            onPress={showCallingComingSoon}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons 
                                                name={item.callType === 'video' ? "videocam-outline" : "call-outline"} 
                                                size={22} 
                                                color={colors.teacher} 
                                            />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity 
                                        style={styles.waActionBtn}
                                        onPress={() => handleDeleteLog(item._id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name="trash-outline" 
                                            size={20} 
                                            color={colors.danger} 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    } else {
                        return (
                            <TouchableOpacity 
                                style={styles.waItemRow}
                                onPress={() => openChat(item)}
                                activeOpacity={0.8}
                            >
                                <View style={{ position: 'relative' }}>
                                    <View style={[styles.waAvatar, { backgroundColor: colors.teacher }]}>
                                        <Text style={styles.waAvatarText}>{item.name?.[0] || 'S'}</Text>
                                    </View>
                                    {onlineUsers?.includes(item._id) && (
                                        <View style={styles.onlineIndicator} />
                                    )}
                                </View>

                                <View style={styles.waDetails}>
                                    <Text style={styles.waName}>{item.name}</Text>
                                    <Text style={styles.waLogTime}>{item.email}</Text>
                                </View>

                                <View style={styles.waActionsRow}>
                                    <TouchableOpacity 
                                        style={styles.waActionBtn}
                                        onPress={() => openChat(item)}
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
                                        onPress={showCallingComingSoon}
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
                                        onPress={showCallingComingSoon}
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
                        );
                    }
                }}
            />



            {/* Chat Modal */}
            {activeContact && contactType === 'chat' && (
                <Modal
                    visible={true}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => {
                        setContactType(null);
                        setActiveContact(null);
                        setChatMessages([]);
                    }}
                >
                    <KeyboardAvoidingView 
                        style={styles.chatContainer} 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        {/* Chat Header */}
                        <View style={styles.chatHeader}>
                            <TouchableOpacity 
                                onPress={() => {
                                    setContactType(null);
                                    setActiveContact(null);
                                    setChatMessages([]);
                                }} 
                                activeOpacity={0.7}
                                style={styles.backBtn}
                            >
                                <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <View style={styles.chatHeaderInfo}>
                                <Text style={{ 
                                    fontSize: 16, 
                                    color: onlineUsers?.includes(activeContact._id) ? '#10b981' : '#cbd5e1', 
                                    marginRight: 4 
                                }}>●</Text>
                                <Text style={styles.chatHeaderTitle}>{activeContact.name.toUpperCase()}</Text>
                            </View>

                            <View style={styles.chatHeaderActions}>
                                <TouchableOpacity 
                                    onPress={showCallingComingSoon}
                                    style={styles.chatHeaderActionBtn}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="call" size={20} color={colors.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={showCallingComingSoon}
                                    style={styles.chatHeaderActionBtn}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="videocam" size={21} color={colors.accent} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Messages Area */}
                        <ScrollView
                            ref={chatScrollViewRef}
                            style={styles.chatMessagesScroll}
                            contentContainerStyle={styles.chatMessagesContent}
                            onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                        >
                            {chatMessages.length === 0 ? (
                                <View style={styles.emptyChat}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                                    <Text style={styles.emptyChatText}>No messages yet</Text>
                                    <Text style={styles.emptyChatSub}>Send a message to start conversing</Text>
                                </View>
                            ) : (
                                chatMessages.map((msg, index) => {
                                    const isSelf = msg.sender?._id === user?._id || msg.sender === user?._id;
                                    
                                    return (
                                        <View 
                                            key={msg._id || index} 
                                            style={[
                                                styles.msgWrapper, 
                                                isSelf ? styles.msgWrapperSelf : styles.msgWrapperPeer
                                            ]}
                                        >
                                            {/* Show Avatar next to peer message */}
                                            {!isSelf && (
                                                <View style={styles.msgAvatarWrapperLeft}>
                                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.student }]}>
                                                        <Text style={styles.msgSmallAvatarText}>{activeContact?.name?.[0]?.toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            <TouchableOpacity 
                                                activeOpacity={0.9}
                                                onLongPress={() => handleLongPressMsg(msg)}
                                                style={[
                                                    styles.msgBubble, 
                                                    isSelf ? styles.msgBubbleSelf : styles.msgBubblePeer
                                                ]}
                                            >
                                                <Text style={isSelf ? styles.msgTextSelf : styles.msgTextPeer}>
                                                    {msg.text}
                                                </Text>
                                                {msg.isEdited && (
                                                    <View style={styles.editedIndicatorRow}>
                                                        <Text style={[styles.editedLabel, isSelf ? styles.editedLabelSelf : styles.editedLabelPeer]}>
                                                            edited
                                                        </Text>
                                                    </View>
                                                )}
                                                {isSelf && msg.isEdited && msg.originalText && (
                                                    <Text style={styles.originalTextPreview}>
                                                        Prev: "{msg.originalText}"
                                                    </Text>
                                                )}
                                            </TouchableOpacity>

                                            {/* Show Avatar next to self message */}
                                            {isSelf && (
                                                <View style={styles.msgAvatarWrapperRight}>
                                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.teacher }]}>
                                                        <Text style={styles.msgSmallAvatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        {/* Editing Banner */}
                        {editingMessage && (
                            <View style={styles.editingBanner}>
                                <View style={styles.editingBannerLeft}>
                                    <Ionicons name="create-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                                    <Text style={styles.editingBannerText} numberOfLines={1}>
                                        Editing: "{editingMessage.text}"
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setEditingMessage(null);
                                        setChatInput('');
                                    }}
                                    style={styles.cancelEditBtn}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Input Bar */}
                        <View style={styles.chatInputBar}>
                            <TouchableOpacity activeOpacity={0.7} style={styles.inputLeftIcon}>
                                <Ionicons name="happy-outline" size={24} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.chatTextInput}
                                placeholder="Type something"
                                placeholderTextColor={colors.textMuted}
                                value={chatInput}
                                onChangeText={setChatInput}
                                multiline
                            />

                            {chatInput.trim().length > 0 ? (
                                <TouchableOpacity 
                                    onPress={handleSendMsg} 
                                    style={styles.sendBtn}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="send" size={18} color={colors.white} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity activeOpacity={0.7} style={styles.inputRightIcon}>
                                    <Ionicons name="attach-outline" size={26} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            )}
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
    chatContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 44 : 50,
        paddingBottom: 14,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    backBtn: {
        padding: 4,
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    chatStatusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chatHeaderTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    chatHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    chatHeaderActionBtn: {
        padding: 6,
    },
    chatMessagesScroll: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    chatMessagesContent: {
        paddingVertical: spacing.md,
    },
    emptyChat: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 180,
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
    },
    msgWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 6,
        maxWidth: '85%',
    },
    msgWrapperSelf: {
        alignSelf: 'flex-end',
    },
    msgWrapperPeer: {
        alignSelf: 'flex-start',
    },
    msgAvatarWrapperLeft: {
        marginRight: 8,
    },
    msgAvatarWrapperRight: {
        marginLeft: 8,
    },
    msgSmallAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    msgSmallAvatarText: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '800',
        color: colors.white,
    },
    msgBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    msgBubbleSelf: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderBottomRightRadius: 4,
    },
    msgBubblePeer: {
        backgroundColor: '#262626',
        borderBottomLeftRadius: 4,
    },
    msgTextSelf: {
        color: '#1e293b',
        fontSize: fontSizes.md - 1,
        fontWeight: '500',
        lineHeight: 20,
    },
    msgTextPeer: {
        color: colors.white,
        fontSize: fontSizes.md - 1,
        fontWeight: '500',
        lineHeight: 20,
    },
    chatInputBar: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    },
    chatTextInput: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: fontSizes.md - 1,
        color: colors.text,
        marginHorizontal: 8,
        maxHeight: 100,
    },
    inputLeftIcon: {
        padding: 4,
    },
    inputRightIcon: {
        padding: 4,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#075e54',
        borderBottomWidth: 1.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3.5,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: colors.white,
    },
    tabText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.65)',
    },
    activeTabText: {
        color: colors.white,
    },
    statusBadge: {
        fontSize: fontSizes.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    editingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    editingBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    editingBannerText: {
        fontSize: fontSizes.xs + 1,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    cancelEditBtn: {
        padding: 2,
    },
    editedIndicatorRow: {
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    editedLabel: {
        fontSize: 9,
        fontWeight: '600',
    },
    editedLabelSelf: {
        color: colors.textMuted,
    },
    editedLabelPeer: {
        color: 'rgba(255,255,255,0.6)',
    },
    originalTextPreview: {
        fontSize: fontSizes.xs - 2,
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: 4,
        borderTopWidth: 0.5,
        borderTopColor: '#cbd5e1',
        paddingTop: 4,
    },
});

export default ContactStudents;
