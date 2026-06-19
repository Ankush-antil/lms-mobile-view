import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const TeacherActivities = ({ navigation }) => {
    const [activities, setActivities] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [subsRes] = await Promise.all([
                axios.get('/submissions').catch(() => ({ data: [] })),
            ]);
            setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    const pending = submissions.filter(s => s.status !== 'evaluated');
    const evaluated = submissions.filter(s => s.status === 'evaluated');

    return (
        <View style={styles.container}>
            <AppHeader title="Activities" showBack />
            <FlatList
                data={[{ type: 'header' }, ...submissions]}
                keyExtractor={(item, i) => item._id || `header-${i}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.teacher} />}
                ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No submissions yet" />}
                renderItem={({ item }) => {
                    if (item.type === 'header') {
                        return (
                            <View>
                                {/* Stats Row */}
                                <View style={styles.statsRow}>
                                    <View style={[styles.statBox, { backgroundColor: '#fef3c7' }]}>
                                        <Ionicons name="time" size={22} color={colors.warning} />
                                        <Text style={styles.statNum}>{pending.length}</Text>
                                        <Text style={styles.statLabel}>Pending</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: '#ecfdf5' }]}>
                                        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                                        <Text style={styles.statNum}>{evaluated.length}</Text>
                                        <Text style={styles.statLabel}>Evaluated</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: '#eef2ff' }]}>
                                        <Ionicons name="document-text" size={22} color={colors.accent} />
                                        <Text style={styles.statNum}>{submissions.length}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.evalBtn}
                                    onPress={() => navigation.navigate('EvaluatePage')}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                                    <Text style={styles.evalBtnText}>Go to Evaluate ({pending.length} pending)</Text>
                                </TouchableOpacity>
                                <Text style={styles.sectionTitle}>All Submissions</Text>
                            </View>
                        );
                    }
                    return (
                        <TouchableOpacity
                            style={styles.subCard}
                            onPress={() => navigation.navigate('EvaluatePage')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.subAvatar}>
                                <Text style={styles.subAvatarText}>{item.student?.name?.[0] || 'S'}</Text>
                            </View>
                            <View style={styles.subInfo}>
                                <Text style={styles.subName}>{item.student?.name || 'Student'}</Text>
                                <Text style={styles.subTest}>{item.test?.title || 'Test'}</Text>
                                <Text style={styles.subDate}>{new Date(item.submittedAt || item.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.subRight}>
                                {item.status === 'evaluated' ? (
                                    <Badge label="Done" color={colors.success} bg="#ecfdf5" />
                                ) : (
                                    <Badge label="Pending" color={colors.warning} bg="#fef3c7" />
                                )}
                                {item.status === 'evaluated' && item.totalMarks !== undefined && (
                                    <Text style={styles.scoreText}>{item.totalMarks} pts</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    listContent: { padding: spacing.md, paddingBottom: 32 },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statBox: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        gap: 4,
    },
    statNum: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.text },
    statLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    evalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.teacher,
        borderRadius: borderRadius.lg,
        paddingVertical: 14,
        marginBottom: spacing.lg,
        elevation: 2,
    },
    evalBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '700' },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    subCard: {
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
    subAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.teacher,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    subInfo: { flex: 1 },
    subName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    subTest: { fontSize: fontSizes.sm, color: colors.textMuted },
    subDate: { fontSize: fontSizes.xs, color: colors.textMuted },
    subRight: { alignItems: 'flex-end', gap: 4 },
    scoreText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.accent },
});

export default TeacherActivities;
