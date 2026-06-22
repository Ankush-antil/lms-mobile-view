import React, { useEffect, useState, useRef } from 'react';
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
    ActivityIndicator,
    ScrollView,
    Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ContactTeacher = ({ navigation }) => {
    const { user } = useAuth();
    const { callUser, onlineUsers, socket } = useSocket();
    
    const showCallingComingSoon = () => {
        Alert.alert('Coming Soon', 'Audio and Video calling features are coming soon.');
    };
    
    const [teachers, setTeachers] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'teachers'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Active Chat State
    const [activeContact, setActiveContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const chatScrollViewRef = useRef(null);

    // Fetch teachers directory and recent conversations
    const fetchData = async () => {
        try {
            const [teachersRes, recentChatsRes] = await Promise.all([
                axios.get('/calls/teachers').catch(() => ({ data: [] })),
                axios.get('/messages/conversations/recent').catch(() => ({ data: [] }))
            ]);
            setTeachers(teachersRes.data || []);
            setRecentChats(recentChatsRes.data || []);
        } catch (e) {
            console.error('[CONTACT_TEACHER] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    // Update recent conversations list
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

            socket.on('new-message', handleNewMessage);
            socket.on('message-sent', handleMessageSent);

            return () => {
                socket.off('new-message', handleNewMessage);
                socket.off('message-sent', handleMessageSent);
            };
        }
    }, [socket, activeContact]);

    const openChat = async (contact) => {
        setActiveContact(contact);
        try {
            const historyRes = await axios.get(`/messages/${contact._id}`);
            setChatMessages(historyRes.data || []);
            // Mark as read
            await axios.put(`/messages/${contact._id}/read`);
            // Refresh list
            fetchData();
        } catch (e) {
            console.error('[CHAT] Error opening chat history:', e);
        }
    };

    const handleSendMsg = () => {
        if (!chatInput.trim() || !activeContact) return;
        
        if (socket && socket.connected) {
            socket.emit('send-message', {
                receiverId: activeContact._id,
                text: chatInput.trim()
            });
            setChatInput('');
        } else {
            console.warn('[CHAT] Socket offline. Unable to send real-time message.');
        }
    };

    // Filter logic
    const filteredTeachers = teachers.filter(t => 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredChats = recentChats.filter(chat => 
        chat.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Top Messages Header */}
            {showSearch ? (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} style={{ padding: 4 }}>
                            <Ionicons name="close" size={22} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Ionicons name="menu-outline" size={26} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>MESSAGES</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setShowSearch(true)} activeOpacity={0.7} style={styles.headerIconBtn}>
                            <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Custom Tab Row resembling reference image */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'chats' && styles.activeTabBtn]}
                    onPress={() => setActiveTab('chats')}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name={activeTab === 'chats' ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                        size={24} 
                        color={activeTab === 'chats' ? colors.accent : colors.textMuted} 
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'teachers' && styles.activeTabBtn]}
                    onPress={() => setActiveTab('teachers')}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name={activeTab === 'teachers' ? "people" : "people-outline"} 
                        size={24} 
                        color={activeTab === 'teachers' ? colors.accent : colors.textMuted} 
                    />
                </TouchableOpacity>
            </View>

            {/* Conversation/Teacher Directory List */}
            <FlatList
                data={activeTab === 'chats' ? filteredChats : filteredTeachers}
                keyExtractor={(item) => item._id || item.contact?._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => { setRefreshing(true); fetchData(); }} 
                        tintColor={colors.accent} 
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={54} color={colors.textMuted} />
                        <Text style={styles.emptyText}>
                            {activeTab === 'chats' ? 'No Recent Chats' : 'No Teachers Found'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    if (activeTab === 'chats') {
                        const contact = item.contact;
                        const lastMsg = item.lastMessage;
                        const isOnline = onlineUsers?.includes(contact?._id);
                        
                        return (
                            <TouchableOpacity 
                                style={styles.contactRow}
                                onPress={() => openChat(contact)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.avatarWrapper}>
                                    <View style={[styles.avatar, { backgroundColor: colors.teacher }]}>
                                        <Text style={styles.avatarText}>{contact?.name?.[0]?.toUpperCase() || 'T'}</Text>
                                    </View>
                                    <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : '#cbd5e1' }]} />
                                </View>

                                <View style={styles.detailsContainer}>
                                    <Text style={styles.contactName}>{contact?.name}</Text>
                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {lastMsg?.text || 'No messages yet'}
                                    </Text>
                                </View>

                                <View style={styles.metaContainer}>
                                    <Text style={styles.timestamp}>
                                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </Text>
                                    {item.unreadCount > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    } else {
                        const isOnline = onlineUsers?.includes(item._id);
                        return (
                            <TouchableOpacity 
                                style={styles.contactRow}
                                onPress={() => openChat(item)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.avatarWrapper}>
                                    <View style={[styles.avatar, { backgroundColor: colors.teacher }]}>
                                        <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'T'}</Text>
                                    </View>
                                    <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : '#cbd5e1' }]} />
                                </View>

                                <View style={styles.detailsContainer}>
                                    <Text style={styles.contactName}>{item.name}</Text>
                                    <Text style={styles.lastMessage} numberOfLines={1}>{item.email}</Text>
                                </View>

                                <View style={styles.metaContainer}>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        );
                    }
                }}
            />

            {/* Chat Modal with Light theme from Image */}
            {activeContact && (
                <Modal
                    visible={true}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => {
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
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.textSecondary} />
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
                                    const senderName = isSelf ? user.name : activeContact.name;
                                    
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
                                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.teacher }]}>
                                                        <Text style={styles.msgSmallAvatarText}>{activeContact.name[0]?.toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            <View 
                                                style={[
                                                    styles.msgBubble, 
                                                    isSelf ? styles.msgBubbleSelf : styles.msgBubblePeer
                                                ]}
                                            >
                                                <Text style={isSelf ? styles.msgTextSelf : styles.msgTextPeer}>
                                                    {msg.text}
                                                </Text>
                                            </View>

                                            {/* Show Avatar next to self message */}
                                            {isSelf && (
                                                <View style={styles.msgAvatarWrapperRight}>
                                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.accent }]}>
                                                        <Text style={styles.msgSmallAvatarText}>{user.name[0]?.toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

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
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 44 : 50,
        paddingBottom: 16,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    headerTitle: {
        fontSize: fontSizes.md + 1,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconBtn: {
        padding: 4,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: fontSizes.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        marginLeft: 10,
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.white,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    activeTabBtn: {
        borderBottomWidth: 2,
        borderBottomColor: colors.accent,
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xl,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.white,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        borderWidth: 2,
        borderColor: colors.white,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    contactName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 3,
    },
    lastMessage: {
        fontSize: fontSizes.sm - 1,
        color: colors.textMuted,
        fontWeight: '500',
    },
    metaContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    timestamp: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        fontWeight: '600',
        marginBottom: 5,
    },
    unreadBadge: {
        backgroundColor: colors.success,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadText: {
        color: colors.white,
        fontSize: fontSizes.xs - 2,
        fontWeight: 'bold',
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

    // Chat modal layout
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
        backgroundColor: '#262626', // Charcoal dark from UI design
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
});

export default ContactTeacher;
