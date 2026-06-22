import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const StudentDashboard = ({ navigation }) => {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [missedCalls, setMissedCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [profileRes, testsRes, subsRes, missedRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/tests'),
                axios.get('/submissions'),
                axios.get('/calls/missed').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            setTests(testsRes.data);
            setSubmissions(subsRes.data);
            setMissedCalls(missedRes.data);
        } catch (error) {
            console.warn('Dashboard fetch error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const clearMissedCall = async (id) => {
        try {
            await axios.post(`/calls/missed/${id}/read`);
            setMissedCalls(prev => prev.filter(c => c._id !== id));
        } catch (e) {}
    };

    if (loading) return <LoadingScreen />;

    const submittedIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedIds.has(t._id));
    const completedTests = tests.filter(t => submittedIds.has(t._id));
    const upcomingTests = pendingTests.slice(0, 5);

    const firstName = profile?.name?.split(' ')[0] || 'Student';

    return (
        <View style={styles.container}>
            <AppHeader
                title="Student Dashboard"
                rightIcon="log-out-outline"
                rightAction={logout}
            />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            >
                {/* Welcome Banner */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.welcomeLeft}>
                        <Text style={styles.welcomeGreeting}>👋 Hello, {firstName}!</Text>
                        <Text style={styles.welcomeSub}>Track your progress below</Text>
                    </View>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{profile?.name?.[0] || 'S'}</Text>
                    </View>
                </View>

                {/* Tags */}
                <View style={styles.tagsRow}>
                    {profile?.studentProfile?.subject && (
                        <Badge label={profile.studentProfile.subject} color={colors.accent} bg="#eef2ff" />
                    )}
                    {profile?.studentProfile?.course?.name && (
                        <Badge label={profile.studentProfile.course.name} color={colors.textSecondary} bg={colors.bgSecondary} />
                    )}
                </View>

                {/* Stat Cards */}
                <View style={styles.statsRow}>
                    <StatCard
                        title="Pending Tests"
                        value={pendingTests.length}
                        icon="time-outline"
                        color={colors.orange}
                        bg="#fff7ed"
                    />
                    <StatCard
                        title="Completed"
                        value={completedTests.length}
                        icon="checkmark-circle-outline"
                        color={colors.success}
                        bg="#ecfdf5"
                    />
                </View>

                {/* Chat with Teachers Quick Banner */}
                <TouchableOpacity
                    style={styles.chatBanner}
                    onPress={() => navigation.navigate('ContactTeacher')}
                    activeOpacity={0.85}
                >
                    <View style={styles.chatBannerLeft}>
                        <View style={styles.chatIconCircle}>
                            <Ionicons name="chatbubbles" size={22} color={colors.white} />
                        </View>
                        <View>
                            <Text style={styles.chatBannerTitle}>Contact Teachers</Text>
                            <Text style={styles.chatBannerSub}>Chat, call, and video call your teachers</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                </TouchableOpacity>

                {/* Missed Calls */}
                {missedCalls.length > 0 && (
                    <SectionCard style={styles.missedCallsCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.missedCallTitle}>
                                <View style={styles.pingDot} />
                                <Text style={styles.sectionTitleDanger}>Missed Calls ({missedCalls.length})</Text>
                            </View>
                        </View>
                        {missedCalls.slice(0, 3).map(call => (
                            <View key={call._id} style={styles.missedCallItem}>
                                <View>
                                    <Text style={styles.missedCallerName}>
                                        {call.caller?.name || 'Teacher'}
                                    </Text>
                                    <Text style={styles.missedCallTime}>
                                        {new Date(call.createdAt).toLocaleString()}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => clearMissedCall(call._id)}
                                    style={styles.dismissBtn}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={14} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </SectionCard>
                )}

                {/* Upcoming Tests */}
                <SectionCard>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Tests</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('StudentTests')} activeOpacity={0.7}>
                            <Text style={styles.viewAll}>View All →</Text>
                        </TouchableOpacity>
                    </View>

                    {upcomingTests.length > 0 ? upcomingTests.map(test => (
                        <View key={test._id} style={styles.testItem}>
                            <View style={styles.testIcon}>
                                <Ionicons name="document-text" size={22} color={colors.accent} />
                            </View>
                            <View style={styles.testInfo}>
                                <Text style={styles.testTitle} numberOfLines={1}>{test.title}</Text>
                                <Text style={styles.testMeta}>
                                    {test.subject} • {test.settings?.duration || '–'} mins
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => navigation.navigate('TakeTest', { testId: test._id })}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.startBtnText}>Start</Text>
                            </TouchableOpacity>
                        </View>
                    )) : (
                        <EmptyState
                            icon="document-outline"
                            title="No pending tests"
                            subtitle="You're all caught up! 🎉"
                        />
                    )}
                </SectionCard>

                {/* Profile Info */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>My Profile</Text>
                    <View style={styles.profileRow}>
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarText}>{profile?.name?.[0]}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{profile?.name}</Text>
                            <Text style={styles.profileEmail}>{profile?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.profileDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Institute</Text>
                            <Text style={styles.detailValue}>{profile?.institute?.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Subject</Text>
                            <Text style={styles.detailValue}>{profile?.studentProfile?.subject || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Enrolled</Text>
                            <Text style={styles.detailValue}>
                                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <Badge label="Active" color={colors.success} bg="#ecfdf5" />
                        </View>
                    </View>
                </SectionCard>
            </ScrollView>
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
        marginBottom: spacing.sm,
    },
    welcomeLeft: {},
    welcomeGreeting: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
    },
    welcomeSub: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: 2,
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.white,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.md,
    },
    missedCallsCard: {
        borderColor: '#fecaca',
        borderWidth: 1,
        backgroundColor: '#fff5f5',
    },
    missedCallTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.danger,
    },
    sectionTitleDanger: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.danger,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    missedCallItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    missedCallerName: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.text,
    },
    missedCallTime: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    dismissBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
    },
    viewAll: {
        fontSize: fontSizes.sm,
        color: colors.accent,
        fontWeight: '600',
    },
    testItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    testIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    testInfo: { flex: 1 },
    testTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    testMeta: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    startBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
    },
    startBtnText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '700',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatarText: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
    },
    profileInfo: { flex: 1 },
    profileName: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
    },
    profileEmail: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
    },
    profileDetails: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailLabel: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.text,
    },
    chatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef2ff',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1.5,
        borderColor: '#e0e7ff',
    },
    chatBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
    },
    chatIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatBannerTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
    },
    chatBannerSub: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default StudentDashboard;
