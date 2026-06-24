import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Image,
    Share
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';

const ScreenshotToolPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [localScreenshots, setLocalScreenshots] = useState([]);
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
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'screenshot');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud files on screenshot page:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load local screenshots
    const loadLocalScreenshots = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_screenshots');
            if (saved) {
                setLocalScreenshots(JSON.parse(saved));
            } else {
                setLocalScreenshots([]);
            }
        } catch (err) {
            console.error("Failed to load local screenshots:", err);
        }
    };

    useEffect(() => {
        fetchCloudFiles();
        loadLocalScreenshots();
    }, []);

    // Filtered lists
    const filteredLocalScreenshots = useMemo(() => {
        return localScreenshots.filter(s => parseDateToDdMmYyyy(s.timestamp) === dateParam);
    }, [localScreenshots, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Choose and save screenshot
    const handlePickScreenshot = async () => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Cannot upload screenshots in a past date log.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
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

            const updatedList = [newLog, ...localScreenshots];
            setLocalScreenshots(updatedList);
            await AsyncStorage.setItem('practice_screenshots', JSON.stringify(updatedList));

            Toast.show({
                type: 'success',
                text1: 'Screenshot Logged',
                text2: 'Screenshot logged in local workspace!'
            });
        } catch (err) {
            console.error('Failed to pick screenshot', err);
            Alert.alert("Error", "Could not load image file.");
        }
    };

    // Sync local unsynced screenshots
    const syncLocalScreenshots = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalScreenshots.filter(s => !s.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local screenshots on this date are synced.");
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    name: item.filename || `screenshot_${item.id}.jpg`,
                    type: 'image/jpeg'
                });
                formData.append('toolType', 'screenshot');

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

        await AsyncStorage.setItem('practice_screenshots', JSON.stringify(localScreenshots));
        await fetchCloudFiles();
        setUploading(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Synced ${successCount} screenshot(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteFile = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this screenshot from ${isCloud ? 'cloud' : 'local'}?`,
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
                                    text2: 'Screenshot deleted from cloud storage!'
                                });
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete from cloud.");
                            }
                        } else {
                            const updated = localScreenshots.filter(s => s.id !== id);
                            setLocalScreenshots(updated);
                            await AsyncStorage.setItem('practice_screenshots', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'Screenshot deleted from local workspace!'
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
                title="Screenshot Tool"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Top Workspace Date indicator */}
            <View style={styles.workspaceHeader}>
                <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
            </View>

            {/* Upload Interface (Only active for today's workspace) */}
            {!isReadOnly && (
                <View style={styles.pickerContainer}>
                    <View style={styles.guideBox}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.guideText}>
                            Take a screenshot on your device (usually Power + Vol Down) and select it below to log.
                        </Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickScreenshot}
                        style={styles.pickerButton}
                    >
                        <Ionicons name="image-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={styles.pickerButtonText}>Select Screenshot from Device</Text>
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
                        Local Log ({filteredLocalScreenshots.length})
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
            {activeTab === 'local' && !isReadOnly && filteredLocalScreenshots.some(s => !s.synced) && (
                <TouchableOpacity
                    disabled={uploading}
                    onPress={syncLocalScreenshots}
                    style={styles.syncBanner}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.syncText}>
                        {uploading ? 'Syncing files with Cloud...' : 'Sync unsynced screenshots to Cloud'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Gallery list */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={activeTab === 'local' ? filteredLocalScreenshots : filteredCloudFiles}
                    keyExtractor={item => item._id || item.id}
                    numColumns={2}
                    contentContainerStyle={styles.galleryContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No screenshots found on this date.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCloud = activeTab === 'cloud';
                        const fileId = isCloud ? item._id : item.id;
                        const fileUrl = isCloud ? `${axios.defaults.baseURL.replace('/api', '')}${item.fileUrl}` : item.uri;
                        const isSynced = isCloud ? true : item.synced;

                        return (
                            <View style={styles.galleryItem}>
                                <Image source={{ uri: fileUrl }} style={styles.screenshotImage} />
                                <View style={styles.overlayButtons}>
                                    <TouchableOpacity
                                        onPress={() => shareFile(fileUrl, isCloud ? item.filename : 'screenshot.jpg')}
                                        style={styles.overlayBtn}
                                    >
                                        <Ionicons name="share-social" size={18} color={colors.white} />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                        <TouchableOpacity
                                            onPress={() => deleteFile(fileId, isCloud)}
                                            style={[styles.overlayBtn, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]}
                                        >
                                            <Ionicons name="trash" size={18} color={colors.white} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {!isCloud && (
                                    <View style={[styles.syncStatusBadge, { backgroundColor: isSynced ? colors.success : colors.warning }]}>
                                        <Text style={styles.syncStatusText}>{isSynced ? 'Synced' : 'Local Only'}</Text>
                                    </View>
                                )}
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
    galleryContent: {
        padding: spacing.sm,
        paddingBottom: 40
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        width: '200%' // Stretch across both columns
    },
    emptyText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 10
    },
    galleryItem: {
        flex: 1,
        height: 200,
        margin: spacing.xs,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative'
    },
    screenshotImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    overlayButtons: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        gap: 6
    },
    overlayBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    syncStatusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.sm
    },
    syncStatusText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '800'
    }
});

export default ScreenshotToolPage;
