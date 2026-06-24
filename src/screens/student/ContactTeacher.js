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
    Alert,
    Image,
    Linking
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BASE_URL } from '../../config/api';

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
    const [editingMessage, setEditingMessage] = useState(null);
    const [isPeerTyping, setIsPeerTyping] = useState(false);

    // Search and attachment states
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [chatSearchDate, setChatSearchDate] = useState('');
    const [showChatSearch, setShowChatSearch] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const chatScrollViewRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const handleCloseChat = () => {
        if (socket && socket.connected && activeContact) {
            socket.emit('stop-typing', { targetId: activeContact._id });
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        setActiveContact(null);
        setChatMessages([]);
        setIsPeerTyping(false);
    };

    const handleTextChange = (text) => {
        setChatInput(text);
        if (socket && socket.connected && activeContact) {
            socket.emit('typing', { targetId: activeContact._id });
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', { targetId: activeContact._id });
            }, 1500);
        }
    };

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
            const handleReceiveMessage = (msg) => {
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

            const handleMessageEdited = (data) => {
                const { messageId, text, isEdited, originalText } = data;
                setChatMessages(prev => prev.map(m => {
                    if (m._id === messageId) {
                        return {
                            ...m,
                            text,
                            isEdited,
                            originalText
                        };
                    }
                    return m;
                }));
            };

            const handleTypingStatus = (data) => {
                const { senderId, isTyping } = data || {};
                if (activeContact && senderId === activeContact._id) {
                    setIsPeerTyping(isTyping);
                }
            };

            socket.on('receive-message', handleReceiveMessage);
            socket.on('message-edited', handleMessageEdited);
            socket.on('typing-status', handleTypingStatus);

            return () => {
                socket.off('receive-message', handleReceiveMessage);
                socket.off('message-edited', handleMessageEdited);
                socket.off('typing-status', handleTypingStatus);
            };
        }
    }, [socket, activeContact]);

    const openChat = async (contact) => {
        setActiveContact(contact);
        setChatSearchQuery('');
        setChatSearchDate('');
        setShowChatSearch(false);
        setAttachedFile(null);
        setEditingMessage(null);
        setIsPeerTyping(false);
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

    const handleSendMsg = async () => {
        if (!chatInput.trim() && !attachedFile) return;
        if (!activeContact) return;
        
        const messageText = chatInput.trim();
        const currentAttachment = attachedFile;
        
        setChatInput('');
        setAttachedFile(null);
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (socket && socket.connected) {
            socket.emit('stop-typing', { targetId: activeContact._id });
        }
        
        try {
            if (editingMessage) {
                // REST PUT request first
                const { data } = await axios.put(`/messages/${editingMessage._id}`, { text: messageText });
                
                // Update local state
                setChatMessages(prev => prev.map(m => m._id === editingMessage._id ? data : m));
                
                // Emit socket edit event to notify receiver
                if (socket && socket.connected) {
                    socket.emit('edit-message', {
                        messageId: editingMessage._id,
                        receiverId: activeContact._id,
                        text: messageText,
                        isEdited: true,
                        originalText: editingMessage.originalText || editingMessage.text
                    });
                }
                setEditingMessage(null);
            } else {
                // REST POST request first
                const payload = {
                    receiver: activeContact._id,
                    text: messageText
                };
                if (currentAttachment) {
                    payload.fileUrl = currentAttachment.fileUrl;
                    payload.fileName = currentAttachment.fileName;
                    payload.fileType = currentAttachment.fileType;
                }
                
                const { data } = await axios.post('/messages', payload);
                
                // Update local state
                setChatMessages(prev => [...prev, data]);
                
                // Emit socket send event to notify receiver
                if (socket && socket.connected) {
                    socket.emit('send-message', {
                        receiverId: activeContact._id,
                        text: messageText,
                        _id: data._id,
                        createdAt: data.createdAt,
                        sender: user._id,
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        fileType: data.fileType
                    });
                }
            }
        } catch (error) {
            console.error('[CHAT] Failed to send/edit message:', error);
            Alert.alert('Error', 'Message could not be sent/updated');
            if (!editingMessage && currentAttachment) {
                setAttachedFile(currentAttachment);
            }
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });
            
            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }
            
            const file = result.assets[0];
            await handleUploadFile(file);
        } catch (e) {
            console.warn('[UPLOAD] Error picking file:', e);
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleUploadFile = async (file) => {
        setUploadingFile(true);
        try {
            const formData = new FormData();
            
            const fileUri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '');
            
            formData.append('file', {
                uri: fileUri,
                name: file.name || 'file',
                type: file.mimeType || 'application/octet-stream'
            });

            const res = await axios.post('/messages/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setAttachedFile(res.data);
        } catch (e) {
            console.error('[UPLOAD] Upload error:', e?.response?.data || e.message);
            Alert.alert('Error', 'Failed to upload attachment');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleChatSearch = async (queryVal, dateVal) => {
        if (!activeContact) return;
        try {
            let url = `/messages/${activeContact._id}?limitDays=20`;
            if (queryVal) {
                url += `&search=${encodeURIComponent(queryVal)}`;
            }
            if (dateVal) {
                url += `&date=${dateVal}`;
            }
            const res = await axios.get(url);
            setChatMessages(res.data || []);
        } catch (e) {
            console.error('[CHAT] Search error:', e);
        }
    };

    // Filter and Combine contacts
    const getCombinedContacts = () => {
        const filteredTeachers = teachers.filter(t => 
            t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const list = filteredTeachers.map(teacher => {
            const chat = recentChats.find(c => c.contact?._id === teacher._id);
            return {
                ...teacher,
                lastMessage: chat?.lastMessage || null,
                unreadCount: chat?.unreadCount || 0
            };
        });

        // Sort: newest messages first, then others
        return list.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return a.name.localeCompare(b.name);
        });
    };

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

            {/* Conversation/Teacher Directory List */}
            <FlatList
                data={getCombinedContacts()}
                keyExtractor={(item) => item._id}
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
                        <Text style={styles.emptyText}>No Teachers Found</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isOnline = onlineUsers?.includes(item._id);
                    const lastMsg = item.lastMessage;
                    
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
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    {lastMsg?.text || item.email}
                                </Text>
                            </View>

                            <View style={styles.metaContainer}>
                                {item.unreadCount > 0 ? (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                    </View>
                                ) : lastMsg ? (
                                    <Text style={styles.timestamp}>
                                        {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                ) : (
                                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Chat Modal with Light theme from Image */}
            {activeContact && (
                <Modal
                    visible={true}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={handleCloseChat}
                >
                    <KeyboardAvoidingView 
                        style={styles.chatContainer} 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        {/* Chat Header */}
                        <View style={styles.chatHeader}>
                            <TouchableOpacity 
                                onPress={handleCloseChat} 
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
                                    onPress={() => setShowChatSearch(prev => !prev)}
                                    style={styles.chatHeaderActionBtn}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="search-outline" size={21} color={showChatSearch ? colors.accent : colors.textSecondary} />
                                </TouchableOpacity>
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

                        {/* Search Filter Panel */}
                        {showChatSearch && (
                            <View style={styles.searchFilterPanel}>
                                <View style={styles.searchFilterRow}>
                                    <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchFilterIcon} />
                                    <TextInput
                                        style={styles.searchFilterInput}
                                        placeholder="Search messages..."
                                        placeholderTextColor={colors.textMuted}
                                        value={chatSearchQuery}
                                        onChangeText={(val) => {
                                            setChatSearchQuery(val);
                                            handleChatSearch(val, chatSearchDate);
                                        }}
                                    />
                                </View>
                                <View style={[styles.searchFilterRow, { marginLeft: 8, flex: 0.8 }]}>
                                    <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={styles.searchFilterIcon} />
                                    <TextInput
                                        style={styles.searchFilterInput}
                                        placeholder="Date (YYYY-MM-DD)"
                                        placeholderTextColor={colors.textMuted}
                                        value={chatSearchDate}
                                        onChangeText={(val) => {
                                            setChatSearchDate(val);
                                            handleChatSearch(chatSearchQuery, val);
                                        }}
                                    />
                                </View>
                                {(chatSearchQuery || chatSearchDate) ? (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setChatSearchQuery('');
                                            setChatSearchDate('');
                                            handleChatSearch('', '');
                                        }}
                                        style={styles.clearSearchBtn}
                                    >
                                        <Text style={styles.clearSearchText}>Clear</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        )}

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
                                    <Text style={styles.emptyChatText}>
                                        {(chatSearchQuery || chatSearchDate) ? "No messages found" : "No messages yet"}
                                    </Text>
                                    <Text style={styles.emptyChatSub}>
                                        {(chatSearchQuery || chatSearchDate) ? "Try clearing search filters" : "Send a message to start conversing"}
                                    </Text>
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

                                            <TouchableOpacity 
                                                activeOpacity={0.9}
                                                onLongPress={() => handleLongPressMsg(msg)}
                                                style={[
                                                    styles.msgBubble, 
                                                    isSelf ? styles.msgBubbleSelf : styles.msgBubblePeer
                                                ]}
                                            >
                                                {msg.fileUrl ? (
                                                    <View style={styles.attachmentContainer}>
                                                        {msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                                            <TouchableOpacity 
                                                                onPress={() => {
                                                                    const url = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}`;
                                                                    Linking.openURL(url).catch(err => console.error("Couldn't open URL", err));
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Image 
                                                                    source={{ uri: msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}` }} 
                                                                    style={styles.attachmentImage} 
                                                                    resizeMode="cover"
                                                                />
                                                            </TouchableOpacity>
                                                        ) : (
                                                            <TouchableOpacity 
                                                                style={[
                                                                    styles.fileCard, 
                                                                    isSelf ? styles.fileCardSelf : styles.fileCardPeer
                                                                ]}
                                                                onPress={() => {
                                                                    const url = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}`;
                                                                    Linking.openURL(url).catch(err => console.error("Couldn't open URL", err));
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Ionicons 
                                                                    name="document-attach" 
                                                                    size={24} 
                                                                    color={isSelf ? '#1e293b' : colors.white} 
                                                                />
                                                                <View style={styles.fileCardInfo}>
                                                                    <Text 
                                                                        style={[
                                                                            styles.fileNameText, 
                                                                            isSelf ? styles.fileNameTextSelf : styles.fileNameTextPeer
                                                                        ]}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {msg.fileName || 'Attached File'}
                                                                    </Text>
                                                                    <Text style={[
                                                                        styles.fileSizeText,
                                                                        isSelf ? { color: colors.textMuted } : { color: 'rgba(255,255,255,0.6)' }
                                                                    ]}>Tap to open</Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                ) : null}
                                                {msg.text ? (
                                                    <Text style={isSelf ? styles.msgTextSelf : styles.msgTextPeer}>
                                                        {msg.text}
                                                    </Text>
                                                ) : null}
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
                                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.accent }]}>
                                                        <Text style={styles.msgSmallAvatarText}>{user.name[0]?.toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                            {isPeerTyping && (
                                <View style={styles.typingRow}>
                                    <View style={[styles.msgSmallAvatar, { backgroundColor: colors.teacher, marginRight: 8 }]}>
                                        <Text style={styles.msgSmallAvatarText}>{activeContact.name[0]?.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.typingBubble}>
                                        <Text style={styles.typingText}>● ● ●</Text>
                                    </View>
                                </View>
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

                        {/* Attachment Preview Banner if file selected */}
                        {attachedFile && (
                            <View style={styles.attachmentPreviewBanner}>
                                <Ionicons name="document-attach" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                                <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                                    Attachment: {attachedFile.fileName}
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => setAttachedFile(null)}
                                    style={styles.cancelAttachmentBtn}
                                >
                                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Uploading Loading Banner */}
                        {uploadingFile && (
                            <View style={styles.attachmentPreviewBanner}>
                                <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />
                                <Text style={styles.attachmentPreviewText}>Uploading attachment...</Text>
                            </View>
                        )}

                        {/* Input Bar */}
                        <View style={styles.chatInputBar}>
                            <TouchableOpacity 
                                activeOpacity={0.7} 
                                style={styles.inputLeftIcon}
                                onPress={handlePickFile}
                                disabled={uploadingFile}
                            >
                                <Ionicons name="attach-outline" size={26} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.chatTextInput}
                                placeholder="Type something"
                                placeholderTextColor={colors.textMuted}
                                value={chatInput}
                                onChangeText={handleTextChange}
                                multiline
                            />

                            {(chatInput.trim().length > 0 || attachedFile) ? (
                                <TouchableOpacity 
                                    onPress={handleSendMsg} 
                                    style={styles.sendBtn}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="send" size={18} color={colors.white} />
                                </TouchableOpacity>
                            ) : null}
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
    searchFilterPanel: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        alignItems: 'center',
    },
    searchFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 36,
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchFilterIcon: {
        marginRight: 4,
    },
    searchFilterInput: {
        flex: 1,
        fontSize: 12,
        color: colors.text,
        paddingVertical: 4,
    },
    clearSearchBtn: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: '#fee2e2',
        borderRadius: 6,
    },
    clearSearchText: {
        color: colors.danger,
        fontSize: 11,
        fontWeight: '700',
    },
    attachmentContainer: {
        marginBottom: 6,
        borderRadius: 8,
        overflow: 'hidden',
    },
    attachmentImage: {
        width: 200,
        height: 150,
        borderRadius: 8,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        width: 200,
        gap: 8,
    },
    fileCardSelf: {
        backgroundColor: '#f1f5f9',
    },
    fileCardPeer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    fileCardInfo: {
        flex: 1,
    },
    fileNameText: {
        fontSize: 12,
        fontWeight: '700',
    },
    fileNameTextSelf: {
        color: '#1e293b',
    },
    fileNameTextPeer: {
        color: colors.white,
    },
    fileSizeText: {
        fontSize: 10,
        marginTop: 2,
    },
    attachmentPreviewBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    attachmentPreviewText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    cancelAttachmentBtn: {
        padding: 2,
    },
    typingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        alignSelf: 'flex-start',
    },
    typingBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
        borderBottomLeftRadius: 4,
    },
    typingText: {
        color: '#64748b',
        fontSize: fontSizes.xs,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});

export default ContactTeacher;
