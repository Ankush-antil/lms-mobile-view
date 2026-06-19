import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Alert,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const TestsList = ({ navigation }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/tests');
            setTests(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const deleteTest = (id) => {
        Alert.alert('Delete Test', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await axios.delete(`/tests/${id}`);
                        setTests(prev => prev.filter(t => t._id !== id));
                    } catch (e) {
                        Alert.alert('Error', 'Could not delete test');
                    }
                }
            }
        ]);
    };

    const [activeTab, setActiveTab] = useState('connected'); // 'connected' | 'public'

    const filtered = tests.filter(t => {
        const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
            t.subject?.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'connected'
            ? (t.publishMode === 'connected' || !t.publishMode)
            : t.publishMode === 'public';
        return matchesSearch && matchesTab;
    });

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Tests" 
                showBack 
                rightIcon="add-outline" 
                rightAction={() => navigation.navigate('TestBuilder')} 
            />
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search tests..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'connected' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('connected')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="link-outline" size={16} color={activeTab === 'connected' ? colors.white : colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeTab === 'connected' && styles.tabBtnTextActive]}>LMS Connected</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'public' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('public')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="globe-outline" size={16} color={activeTab === 'public' ? colors.white : colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeTab === 'public' && styles.tabBtnTextActive]}>Public Web</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.countText}>{filtered.length} Tests ({activeTab === 'connected' ? 'LMS Connected' : 'Public Web'})</Text>
            <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                ListEmptyComponent={<EmptyState icon="document-text-outline" title="No tests found" />}
                renderItem={({ item }) => (
                    <View style={styles.testCard}>
                        <View style={styles.testIcon}>
                            <Ionicons name="document-text" size={22} color={colors.admin} />
                        </View>
                        <View style={styles.testInfo}>
                            <Text style={styles.testTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.testMeta}>{item.subject} • {item.questions?.length || 0} Qs • {item.settings?.duration || '–'} min</Text>
                            {item.activity && <Badge label={item.activity} color={colors.admin} bg="#fef2f2" />}
                        </View>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('TestBuilder', { testId: item._id })}
                                style={styles.editBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={18} color={colors.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteTest(item._id)}
                                style={styles.deleteBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        padding: 4,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: borderRadius.sm,
    },
    tabBtnActive: {
        backgroundColor: colors.admin,
    },
    tabBtnText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    tabBtnTextActive: {
        color: colors.white,
    },
    countText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 32 },
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
    testIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    testInfo: { flex: 1 },
    testTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 3 },
    testMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 5 },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TestsList;
