import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const StudentTests = ({ navigation }) => {
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // pending | completed

    const fetchData = async () => {
        try {
            const [testsRes, subsRes] = await Promise.all([
                axios.get('/tests'),
                axios.get('/submissions'),
            ]);
            setTests(testsRes.data);
            setSubmissions(subsRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const submittedIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedIds.has(t._id));
    const completedTests = tests.filter(t => submittedIds.has(t._id));
    const activeTests = activeTab === 'pending' ? pendingTests : completedTests;
    const filtered = activeTests.filter(t =>
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.subject?.toLowerCase().includes(search.toLowerCase())
    );

    const getSubmission = (testId) => submissions.find(s => (s.test?._id || s.test) === testId);

    if (loading) return <LoadingScreen />;

    const renderTestItem = ({ item }) => {
        const submission = getSubmission(item._id);
        const isCompleted = !!submission;

        return (
            <TouchableOpacity
                style={styles.testCard}
                activeOpacity={0.8}
                onPress={() => {
                    if (isCompleted && submission) {
                        navigation.navigate('ViewTestResult', { submissionId: submission._id });
                    } else {
                        navigation.navigate('TakeTest', { testId: item._id });
                    }
                }}
            >
                <View style={[styles.testCardLeft, { backgroundColor: isCompleted ? '#ecfdf5' : '#eef2ff' }]}>
                    <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'document-text'}
                        size={26}
                        color={isCompleted ? colors.success : colors.accent}
                    />
                </View>
                <View style={styles.testCardInfo}>
                    <Text style={styles.testCardTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.testCardMeta}>
                        <Ionicons name="book-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.testCardMetaText}>{item.subject || '–'}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.testCardMetaText}>{item.settings?.duration || '–'} min</Text>
                    </View>
                    {item.activity && (
                        <Badge label={item.activity} color={colors.accent} bg="#eef2ff" />
                    )}
                </View>
                <View style={styles.testCardRight}>
                    {isCompleted ? (
                        <View>
                            <Text style={styles.scoreText}>{submission?.totalScore ?? '–'}</Text>
                            <Text style={styles.scoreLabel}>Score</Text>
                        </View>
                    ) : (
                        <View style={styles.startChip}>
                            <Text style={styles.startChipText}>Start</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="My Tests" showBack />
            
            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    onPress={() => setActiveTab('pending')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="time-outline" size={14} color={activeTab === 'pending' ? colors.white : colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                        Pending ({pendingTests.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
                    onPress={() => setActiveTab('completed')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="checkmark-circle-outline" size={14} color={activeTab === 'completed' ? colors.white : colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
                        Completed ({completedTests.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search tests..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                renderItem={renderTestItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                ListEmptyComponent={
                    <EmptyState
                        icon={activeTab === 'pending' ? 'time-outline' : 'checkmark-done-circle-outline'}
                        title={activeTab === 'pending' ? 'No pending tests' : 'No completed tests'}
                        subtitle={activeTab === 'pending' ? "You're all caught up! 🎉" : 'Complete some tests first'}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        padding: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        borderRadius: borderRadius.md,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.white,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
    },
    list: {
        paddingHorizontal: spacing.md,
        paddingBottom: 32,
    },
    testCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    testCardLeft: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testCardInfo: { flex: 1 },
    testCardTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 3,
    },
    testCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 5,
    },
    testCardMetaText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    dot: { color: colors.textMuted, fontSize: fontSizes.xs },
    testCardRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    scoreText: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.success,
        textAlign: 'right',
    },
    scoreLabel: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        textAlign: 'right',
    },
    startChip: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    startChipText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
});

export default StudentTests;
