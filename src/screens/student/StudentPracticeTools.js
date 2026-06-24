import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { AppHeader } from '../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../utils/dateUtils';

const StudentPracticeTools = ({ navigation }) => {
    const isFocused = useIsFocused();
    const [selectedDate, setSelectedDate] = useState(getTodayDdMmYyyy());
    const [loading, setLoading] = useState(true);

    const [cloudFiles, setCloudFiles] = useState([]);
    const [localFiles, setLocalFiles] = useState([]);
    const [datesList, setDatesList] = useState([]);

    const loadAllPracticeData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Cloud Files from Server
            const cloudRes = await axios.get('/practice-files');
            const cFiles = cloudRes.data.files || [];
            setCloudFiles(cFiles);

            // 2. Fetch Local Files metadata from AsyncStorage
            const allLocal = [];

            // Screenshots
            const screenshotsStr = await AsyncStorage.getItem('practice_screenshots');
            if (screenshotsStr) {
                try {
                    const list = JSON.parse(screenshotsStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Screenshot Tool',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Screen Recordings
            const screenStr = await AsyncStorage.getItem('practice_screen_recordings');
            if (screenStr) {
                try {
                    const list = JSON.parse(screenStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Screen Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Videos
            const videoStr = await AsyncStorage.getItem('practice_videos');
            if (videoStr) {
                try {
                    const list = JSON.parse(videoStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Video Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Audios
            const audioStr = await AsyncStorage.getItem('practice_audios');
            if (audioStr) {
                try {
                    const list = JSON.parse(audioStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Voice Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Call Logs
            const logsStr = await AsyncStorage.getItem('practice_call_logs');
            if (logsStr) {
                try {
                    const list = JSON.parse(logsStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.date,
                            toolType: 'Web-Calling Tool',
                            parsedDate: parseDateToDdMmYyyy(item.date)
                        });
                    });
                } catch (e) {}
            }

            setLocalFiles(allLocal);

            // 3. Extract and Aggregate Unique Dates
            const today = getTodayDdMmYyyy();
            const datesMap = {};
            datesMap[today] = true; // Always guarantee today is present

            cFiles.forEach(f => {
                const parsed = parseDateToDdMmYyyy(f.createdAt);
                if (parsed !== 'Unknown Date') datesMap[parsed] = true;
            });

            allLocal.forEach(f => {
                if (f.parsedDate !== 'Unknown Date') datesMap[f.parsedDate] = true;
            });

            // Sort dates descending
            const sortedDates = Object.keys(datesMap).sort((a, b) => {
                const aParts = a.split('-');
                const bParts = b.split('-');
                const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
                const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
                return bTime - aTime;
            });

            setDatesList(sortedDates);
        } catch (err) {
            console.error("Failed to load practice files dates on mobile", err);
            // Guarantee today is at least in the list
            const today = getTodayDdMmYyyy();
            setDatesList([today]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadAllPracticeData();
        }
    }, [isFocused]);

    const isTodaySelected = useMemo(() => {
        return selectedDate === getTodayDdMmYyyy();
    }, [selectedDate]);

    // Count utility for tools on the active selected date
    const getFileCountForTool = (toolTitle) => {
        const dbTypeMap = {
            'Screenshot Tool': 'screenshot',
            'Screen Recorder': 'screen-recorder',
            'Voice Recorder': 'voice-recorder',
            'Video Recorder': 'video-recorder',
            'Web-Calling Tool': 'web-calling'
        };

        const localCount = localFiles.filter(f => f.parsedDate === selectedDate && f.toolType === toolTitle).length;

        const dbType = dbTypeMap[toolTitle];
        const cloudCount = cloudFiles.filter(c => {
            const fileDate = parseDateToDdMmYyyy(c.createdAt);
            return fileDate === selectedDate && c.toolType === dbType;
        }).length;

        return localCount + cloudCount;
    };

    const handleLaunchTool = (screenName) => {
        navigation.navigate(screenName, { date: selectedDate });
    };

    const practiceToolsConfig = [
        {
            title: "Screenshot Tool",
            icon: "camera-outline",
            screen: "ScreenshotToolPage",
            color: "#6366f1",
            bg: "#eef2ff",
            borderColor: "#cbd5e1"
        },
        {
            title: "Screen Recorder",
            icon: "videocam-outline",
            screen: "ScreenRecorderPage",
            color: "#10b981",
            bg: "#ecfdf5",
            borderColor: "#cbd5e1"
        },
        {
            title: "Voice Recorder",
            icon: "mic-outline",
            screen: "VoiceRecorderPage",
            color: "#3b82f6",
            bg: "#eff6ff",
            borderColor: "#cbd5e1"
        },
        {
            title: "Video Recorder",
            icon: "film-outline",
            screen: "VideoRecorderPage",
            color: "#8b5cf6",
            bg: "#f5f3ff",
            borderColor: "#cbd5e1"
        },
        {
            title: "Web-Calling Tool",
            icon: "call-outline",
            screen: "WebCallingPage",
            color: "#ec4899",
            bg: "#fdf2f8",
            borderColor: "#cbd5e1"
        }
    ];

    return (
        <View style={styles.container}>
            <AppHeader
                title="Practice Workspace"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Date Selector Header */}
            <View style={styles.dateSelectorSection}>
                <Text style={styles.sectionLabel}>WORKSPACE DATE LOGS</Text>
                {loading ? (
                    <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 10 }} />
                ) : (
                    <FlatList
                        horizontal
                        data={datesList}
                        keyExtractor={item => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.datesListContainer}
                        renderItem={({ item }) => {
                            const isActive = selectedDate === item;
                            const isToday = item === getTodayDdMmYyyy();
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedDate(item)}
                                    style={[
                                        styles.dateBadge,
                                        isActive && styles.dateBadgeActive
                                    ]}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={14}
                                        color={isActive ? colors.white : colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.dateText, isActive && styles.dateTextActive]}>
                                        {item}
                                    </Text>
                                    {isToday && (
                                        <View style={[styles.todayDot, isActive && styles.todayDotActive]} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Active Workspace Banner */}
                <View style={[
                    styles.infoBanner,
                    isTodaySelected ? styles.infoBannerActive : styles.infoBannerReadOnly
                ]}>
                    <Ionicons
                        name={isTodaySelected ? "unlock-outline" : "lock-closed-outline"}
                        size={20}
                        color={isTodaySelected ? colors.success : colors.warning}
                        style={{ marginRight: 10, marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[
                            styles.bannerTitle,
                            { color: isTodaySelected ? '#065f46' : '#92400e' }
                        ]}>
                            {isTodaySelected ? 'Active Practice Environment' : 'Archive Read-Only Mode'}
                        </Text>
                        <Text style={[
                            styles.bannerSub,
                            { color: isTodaySelected ? '#047857' : '#b45309' }
                        ]}>
                            {isTodaySelected
                                ? 'You can record audio clips, snap screenshots, and perform file deletions. Cloud uploads and sync are fully active.'
                                : 'You are viewing logs created on this date. File recording, uploads, and deletions are disabled for this archive date.'
                            }
                        </Text>
                    </View>
                </View>

                {/* Tools Grid */}
                <Text style={styles.gridHeader}>CHOOSE PRACTICE TOOL</Text>
                <View style={styles.grid}>
                    {practiceToolsConfig.map((tool, index) => {
                        const fileCount = getFileCountForTool(tool.title);
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.85}
                                onPress={() => handleLaunchTool(tool.screen)}
                                style={[styles.toolCard, { backgroundColor: tool.bg }]}
                            >
                                <View style={styles.toolCardHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: tool.color }]}>
                                        <Ionicons name={tool.icon} size={24} color={colors.white} />
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={[styles.badgeText, { color: tool.color }]}>
                                            {fileCount} {fileCount === 1 ? 'file' : 'files'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.toolTitle}>{tool.title}</Text>
                                <View style={styles.launchRow}>
                                    <Text style={[styles.launchText, { color: tool.color }]}>Launch Tool</Text>
                                    <Ionicons name="arrow-forward-outline" size={14} color={tool.color} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg
    },
    dateSelectorSection: {
        backgroundColor: colors.bgCard,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    sectionLabel: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '900',
        color: colors.textMuted,
        paddingHorizontal: spacing.md,
        marginBottom: 6,
        letterSpacing: 1
    },
    datesListContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: 4
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border
    },
    dateBadgeActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent
    },
    dateText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    dateTextActive: {
        color: colors.white
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
        marginLeft: 6
    },
    todayDotActive: {
        backgroundColor: colors.white
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 32
    },
    infoBanner: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        marginBottom: spacing.lg
    },
    infoBannerActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0'
    },
    infoBannerReadOnly: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a'
    },
    bannerTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        marginBottom: 2
    },
    bannerSub: {
        fontSize: fontSizes.xs,
        fontWeight: '500',
        lineHeight: 16
    },
    gridHeader: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '900',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        letterSpacing: 1
    },
    grid: {
        gap: spacing.md
    },
    toolCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    toolCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    badge: {
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    badgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '900',
        textTransform: 'uppercase'
    },
    toolTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4
    },
    launchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    launchText: {
        fontSize: fontSizes.xs,
        fontWeight: '700'
    }
});

export default StudentPracticeTools;
