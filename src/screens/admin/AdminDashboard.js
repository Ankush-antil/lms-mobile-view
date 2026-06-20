import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, TextInput,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const AdminDashboard = ({ navigation }) => {
    const { user, logout } = useAuth();
    const isEditor = user?.role === 'Editor';
    
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (isEditor) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const { data } = await axios.get('/dashboard/stats');
            setStats(data.stats);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    const quickLinks = isEditor 
        ? [
            { label: 'Tests List', icon: 'document-text', screen: 'TestsList', color: colors.admin, bg: '#fef2f2' },
            { label: 'Test Builder', icon: 'add-circle', screen: 'TestBuilder', color: colors.success, bg: '#ecfdf5' },
          ]
        : [
            { label: 'Students', icon: 'person', screen: 'StudentsList', color: colors.student, bg: '#eef2ff' },
            { label: 'Teachers', icon: 'people', screen: 'TeachersList', color: colors.teacher, bg: '#ecfdf5' },
            { label: 'Courses', icon: 'book', screen: 'CoursesList', color: colors.warning, bg: '#fef3c7' },
            { label: 'Tests', icon: 'document-text', screen: 'TestsList', color: colors.admin, bg: '#fef2f2' },
            { label: 'Institutes', icon: 'business', screen: 'InstitutesList', color: colors.accent, bg: '#eef2ff' },
          ];

    return (
        <View style={styles.container}>
            <AppHeader title={isEditor ? "Editor Dashboard" : "Admin Dashboard"} rightIcon="log-out-outline" rightAction={logout} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={isEditor ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.admin} />}
            >
                {/* Welcome */}
                <View style={styles.welcomeBanner}>
                    <View style={[styles.adminBadge, { backgroundColor: isEditor ? '#eef2ff' : '#fef2f2' }]}>
                        <Ionicons name={isEditor ? "create-outline" : "shield-checkmark"} size={14} color={isEditor ? colors.accent : colors.admin} />
                        <Text style={[styles.adminBadgeText, { color: isEditor ? colors.accent : colors.admin }]}>{isEditor ? "Editor" : "Admin"}</Text>
                    </View>
                    <Text style={styles.welcomeTitle}>{isEditor ? "Editor Panel" : "Admin Panel"}</Text>
                    <Text style={styles.welcomeSub}>{isEditor ? "Create & manage test resources" : "Manage your LMS system"}</Text>
                </View>

                {/* Stat Cards */}
                {!isEditor && (
                    <View style={styles.statsGrid}>
                        <View style={styles.statsRow}>
                            <StatCard title="Students" value={stats?.students} icon="person" color={colors.student} bg="#eef2ff" />
                            <StatCard title="Teachers" value={stats?.teachers} icon="people" color={colors.teacher} bg="#ecfdf5" />
                        </View>
                        <View style={styles.statsRow}>
                            <StatCard title="Tests" value={stats?.tests} icon="document-text" color={colors.admin} bg="#fef2f2" />
                            <StatCard title="Courses" value={stats?.courses} icon="book" color={colors.warning} bg="#fef3c7" />
                        </View>
                    </View>
                )}

                {/* Quick Links */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Manage</Text>
                    <View style={styles.quickLinks}>
                        {quickLinks.map(link => (
                            <TouchableOpacity
                                key={link.label}
                                style={styles.quickLink}
                                onPress={() => navigation.navigate(link.screen)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.quickLinkIcon, { backgroundColor: link.bg }]}>
                                    <Ionicons name={link.icon} size={22} color={link.color} />
                                </View>
                                <Text style={styles.quickLinkLabel}>{link.label}</Text>
                                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                        ))}
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
        marginBottom: spacing.md,
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 6,
    },
    adminBadgeText: { fontSize: fontSizes.xs, fontWeight: '800', textTransform: 'uppercase' },
    welcomeTitle: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.text },
    welcomeSub: { fontSize: fontSizes.sm, color: colors.textMuted },
    statsGrid: { gap: 8, marginBottom: spacing.md },
    statsRow: { flexDirection: 'row', gap: 8 },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    quickLinks: {},
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    quickLinkIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLinkLabel: {
        flex: 1,
        fontSize: fontSizes.md,
        fontWeight: '600',
        color: colors.text,
    },
});

export default AdminDashboard;
