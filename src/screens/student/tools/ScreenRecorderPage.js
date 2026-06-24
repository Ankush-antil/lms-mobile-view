import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Share,
    Linking
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../../config/api';

const ScreenRecorderPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    const playVideo = async (url) => {
        try {
            await Linking.openURL(url);
        } catch (err) {
            console.error("Failed to play video:", err);
            Alert.alert("Error", "Could not open video player.");
        }
    };

    // States
    const [localRecordings, setLocalRecordings] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'cloud'
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/practice-files');
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'screen-recorder');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud screen recordings:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load local recordings
    const loadLocalRecordings = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_screen_recordings');
            if (saved) {
                setLocalRecordings(JSON.parse(saved));
            } else {
                setLocalRecordings([]);
            }
        } catch (err) {
            console.error("Failed to load local screen recordings:", err);
        }
    };

    useEffect(() => {
        fetchCloudFiles();
        loadLocalRecordings();
    }, []);

    // Filtered lists
    const filteredLocalRecordings = useMemo(() => {
        return localRecordings.filter(r => parseDateToDdMmYyyy(r.timestamp) === dateParam);
    }, [localRecordings, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Pick screen recording file from device
    const handlePickRecording = async () => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Cannot upload screen recordings in a past date log.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'video/*',
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            const newLog = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                uri: asset.uri,
                filename: asset.name,
                size: asset.size || 0,
                synced: false
            };

            const updatedList = [newLog, ...localRecordings];
            setLocalRecordings(updatedList);
            await AsyncStorage.setItem('practice_screen_recordings', JSON.stringify(updatedList));

            Toast.show({
                type: 'success',
                text1: 'Recording Logged',
                text2: 'Screen recording saved in local workspace!'
            });
        } catch (err) {
            console.error('Failed to pick screen recording', err);
            Alert.alert("Error", "Could not load video file.");
        }
    };

    // Sync local recordings
    const syncLocalRecordings = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalRecordings.filter(r => !r.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local screen recordings on this date are synced.");
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    name: item.filename || `screen_${item.id}.mp4`,
                    type: 'video/mp4'
                });
                formData.append('toolType', 'screen-recorder');

                await axios.post('/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Failed to sync screen recording:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    Alert.alert("Storage Limit Exceeded", errMsg);
                    break;
                }
            }
        }

        await AsyncStorage.setItem('practice_screen_recordings', JSON.stringify(localRecordings));
        await fetchCloudFiles();
        setUploading(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Synced ${successCount} screen recording(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteFile = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this recording from ${isCloud ? 'cloud' : 'local'}?`,
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
                                Alert.alert("Error", "Failed to delete from cloud.");
                            }
                        } else {
                            const updated = localRecordings.filter(r => r.id !== id);
                            setLocalRecordings(updated);
                            await AsyncStorage.setItem('practice_screen_recordings', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'Recording deleted from local workspace!'
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

    return (
        <View style={styles.container}>
            <AppHeader
                title="Screen Recorder"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Top Workspace Date indicator */}
            <View style={styles.workspaceHeader}>
                <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
            </View>

            {/* Selector Interface (Only active for today's workspace) */}
            {!isReadOnly && (
                <View style={styles.pickerContainer}>
                    <View style={styles.guideBox}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.guideText}>
                            Start screen recording using your system's built-in recorder, and upload the video file here to log.
                        </Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickRecording}
                        style={styles.pickerButton}
                    >
                        <Ionicons name="desktop-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={styles.pickerButtonText}>Select Screen Recording File</Text>
                    </TouchableOpacity>
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
                        Local Log ({filteredLocalRecordings.length})
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
            {activeTab === 'local' && !isReadOnly && filteredLocalRecordings.some(r => !r.synced) && (
                <TouchableOpacity
                    disabled={uploading}
                    onPress={syncLocalRecordings}
                    style={styles.syncBanner}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.syncText}>
                        {uploading ? 'Syncing files with Cloud...' : 'Sync unsynced screen recordings'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={activeTab === 'local' ? filteredLocalRecordings : filteredCloudFiles}
                    keyExtractor={item => item._id || item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="desktop-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No screen recordings found on this date.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCloud = activeTab === 'cloud';
                        const fileId = isCloud ? item._id : item.id;
                        const fileUrl = isCloud ? `${BASE_URL}${item.fileUrl}` : item.uri;
                        const isSynced = isCloud ? true : item.synced;

                        return (
                            <View style={styles.fileItem}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => playVideo(fileUrl)}
                                    style={styles.videoIconContainer}
                                >
                                    <Ionicons name="play-circle-outline" size={32} color={colors.accent} />
                                </TouchableOpacity>
                                <View style={styles.fileDetails}>
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {isCloud ? item.filename : item.filename || `screen_recording_${fileId}.mp4`}
                                    </Text>
                                    <View style={styles.fileMeta}>
                                        <Text style={styles.metaText}>
                                            {(item.size / (1024 * 1024)).toFixed(2)} MB
                                        </Text>
                                        <View style={styles.dot} />
                                        <Text style={styles.metaText}>
                                            {isCloud ? 'Cloud File' : 'Local Log'}
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
                                    <TouchableOpacity
                                        onPress={() => shareFile(fileUrl, isCloud ? item.filename : 'screen_recording.mp4')}
                                        style={styles.actionButton}
                                    >
                                        <Ionicons name="share-social-outline" size={20} color={colors.accent} />
                                    </TouchableOpacity>
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
    pickerContainer: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    guideBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 10,
        borderRadius: borderRadius.md,
        marginBottom: 12
    },
    guideText: {
        flex: 1,
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '600',
        lineHeight: 16
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    pickerButtonText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '800'
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
        paddingVertical: 80
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
    videoIconContainer: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center'
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

export default ScreenRecorderPage;
