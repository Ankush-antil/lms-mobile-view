import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Share
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../../config/api';

const VoiceRecorderPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [localAudios, setLocalAudios] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'cloud'
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    // Playback state
    const [playingId, setPlayingId] = useState(null);
    const [soundInstance, setSoundInstance] = useState(null);

    const timerRef = useRef(null);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/practice-files');
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'voice-recorder');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud files on voice page:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load local recordings
    const loadLocalRecordings = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_audios');
            if (saved) {
                setLocalAudios(JSON.parse(saved));
            } else {
                setLocalAudios([]);
            }
        } catch (err) {
            console.error("Failed to load local audios:", err);
        }
    };

    useEffect(() => {
        fetchCloudFiles();
        loadLocalRecordings();
    }, []);

    // Filtered lists
    const filteredLocalAudios = useMemo(() => {
        return localAudios.filter(a => parseDateToDdMmYyyy(a.timestamp) === dateParam);
    }, [localAudios, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Handle recording timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    // Clean up audio sound instances on unmount
    useEffect(() => {
        return () => {
            if (soundInstance) {
                soundInstance.unloadAsync();
            }
        };
    }, [soundInstance]);

    // Start audio recording
    const startRecording = async () => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Cannot record in a past date log.");
            return;
        }
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert("Permission Required", "Please allow microphone access to record audio.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            setDuration(0);
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Error", "Could not start audio recording.");
        }
    };

    // Stop recording
    const stopRecording = async () => {
        if (!recording) return;
        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            const newLog = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                duration: duration,
                uri: uri,
                synced: false
            };

            const updatedList = [newLog, ...localAudios];
            setLocalAudios(updatedList);
            await AsyncStorage.setItem('practice_audios', JSON.stringify(updatedList));

            Toast.show({
                type: 'success',
                text1: 'Audio Saved',
                text2: 'Recording saved to local workspace!'
            });
        } catch (err) {
            console.error('Failed to stop recording', err);
            Alert.alert("Error", "Could not stop and save recording.");
        }
    };

    // Playback control
    const playSound = async (uri, id) => {
        try {
            if (playingId === id) {
                // Pause/Stop
                if (soundInstance) {
                    await soundInstance.stopAsync();
                    await soundInstance.unloadAsync();
                }
                setPlayingId(null);
                setSoundInstance(null);
                return;
            }

            if (soundInstance) {
                await soundInstance.stopAsync();
                await soundInstance.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: uri },
                { shouldPlay: true }
            );
            
            setSoundInstance(sound);
            setPlayingId(id);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setPlayingId(null);
                    setSoundInstance(null);
                }
            });
        } catch (err) {
            console.error("Playback error:", err);
            Alert.alert("Error", "Could not play audio file.");
        }
    };

    // Sync local audios
    const syncLocalAudios = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalAudios.filter(a => !a.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local audios on this date are already synced to cloud.");
            return;
        }

        setSyncing(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    name: `voice_recording_${item.id}.m4a`,
                    type: 'audio/m4a'
                });
                formData.append('toolType', 'voice-recorder');
                formData.append('duration', item.duration.toString());

                await axios.post('/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Failed to sync item:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    Alert.alert("Storage Limit Exceeded", errMsg);
                    break;
                }
            }
        }

        // Save updated local status
        await AsyncStorage.setItem('practice_audios', JSON.stringify(localAudios));
        await fetchCloudFiles();
        setSyncing(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Successfully synced ${successCount} recording(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteFile = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this recording from ${isCloud ? 'cloud' : 'local'} storage?`,
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
                                    text2: 'Recording deleted from cloud storage!'
                                });
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete file from cloud.");
                            }
                        } else {
                            const updated = localAudios.filter(a => a.id !== id);
                            setLocalAudios(updated);
                            await AsyncStorage.setItem('practice_audios', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'Recording deleted from local storage!'
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
        const mins = Math.floor(secs / 60);
        const remain = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remain.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Voice Recorder"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Top Workspace Date indicator */}
            <View style={styles.workspaceHeader}>
                <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
            </View>

            {/* Recorder Interface (Only active for today's workspace) */}
            {!isReadOnly && (
                <View style={styles.recorderContainer}>
                    <Text style={styles.timerText}>{formatTime(duration)}</Text>
                    {isRecording ? (
                        <View style={styles.recordingPulse}>
                            <View style={styles.pulseInner} />
                        </View>
                    ) : (
                        <Text style={styles.statusLabel}>Tap to start recording</Text>
                    )}

                    <View style={styles.controlsRow}>
                        {isRecording ? (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={stopRecording}
                                style={[styles.controlButton, styles.stopBtn]}
                            >
                                <Ionicons name="square" size={28} color={colors.white} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={startRecording}
                                style={[styles.controlButton, styles.recordBtn]}
                            >
                                <Ionicons name="mic" size={32} color={colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    onPress={() => setActiveTab('local')}
                    style={[styles.tabButton, activeTab === 'local' && styles.tabButtonActive]}
                >
                    <Ionicons name="folder-open-outline" size={18} color={activeTab === 'local' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
                        Local Log ({filteredLocalAudios.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('cloud')}
                    style={[styles.tabButton, activeTab === 'cloud' && styles.tabButtonActive]}
                >
                    <Ionicons name="cloud-done-outline" size={18} color={activeTab === 'cloud' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActive]}>
                        Cloud Storage ({filteredCloudFiles.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Cloud Space Details */}
            {activeTab === 'cloud' && (
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
            )}

            {/* Sync bar for local files */}
            {activeTab === 'local' && !isReadOnly && filteredLocalAudios.some(a => !a.synced) && (
                <TouchableOpacity
                    disabled={syncing}
                    onPress={syncLocalAudios}
                    style={styles.syncBanner}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.syncText}>
                        {syncing ? 'Syncing files with Cloud...' : 'Sync unsynced audios to Cloud'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={activeTab === 'local' ? filteredLocalAudios : filteredCloudFiles}
                    keyExtractor={item => item._id || item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No recordings found on this date.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCloud = activeTab === 'cloud';
                        const fileId = isCloud ? item._id : item.id;
                        const isPlaying = playingId === fileId;
                        const durationSec = isCloud ? (item.metadata?.duration || 0) : item.duration;
                        const fileUrl = isCloud ? `${BASE_URL}${item.fileUrl}` : item.uri;
                        const isSynced = isCloud ? true : item.synced;

                        return (
                            <View style={styles.fileItem}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => playSound(fileUrl, fileId)}
                                    style={styles.playIconContainer}
                                >
                                    <Ionicons
                                        name={isPlaying ? "pause-circle" : "play-circle"}
                                        size={36}
                                        color={isPlaying ? colors.accent : colors.success}
                                    />
                                </TouchableOpacity>

                                <View style={styles.fileDetails}>
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {isCloud ? item.filename : `Voice recording_${fileId}.m4a`}
                                    </Text>
                                    <View style={styles.fileMeta}>
                                        <Text style={styles.metaText}>{formatTime(durationSec)}</Text>
                                        <View style={styles.dot} />
                                        <Text style={styles.metaText}>
                                            {isCloud ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Local Log'}
                                        </Text>
                                        {!isCloud && (
                                            <>
                                                <View style={styles.dot} />
                                                <Ionicons
                                                    name={isSynced ? "cloud-done" : "cloud-offline"}
                                                    size={14}
                                                    color={isSynced ? colors.success : colors.warning}
                                                />
                                            </>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.actionButtons}>
                                    {isCloud && (
                                        <TouchableOpacity
                                            onPress={() => shareFile(fileUrl, item.filename)}
                                            style={styles.actionButton}
                                        >
                                            <Ionicons name="share-social-outline" size={20} color={colors.accent} />
                                        </TouchableOpacity>
                                    )}
                                    {!isReadOnly && (
                                        <TouchableOpacity
                                            onPress={() => deleteFile(fileId, isCloud)}
                                            style={styles.actionButton}
                                        >
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
    recorderContainer: {
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    timerText: {
        fontSize: 48,
        fontWeight: '800',
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        marginBottom: 8
    },
    recordingPulse: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    pulseInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.danger
    },
    statusLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        marginBottom: 16
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    controlButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
    },
    recordBtn: {
        backgroundColor: colors.accent
    },
    stopBtn: {
        backgroundColor: colors.danger
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
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    tabTextActive: {
        color: colors.accent
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
        paddingVertical: 60
    },
    emptyText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 10
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border
    },
    playIconContainer: {
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
    }
});

export default VoiceRecorderPage;
