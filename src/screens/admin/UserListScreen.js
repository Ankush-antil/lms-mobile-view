import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const UserListScreen = ({ navigation, route, endpoint, title, role, color, bg, badgeField, navigateTo }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const { data } = await axios.get(endpoint);
            setUsers(Array.isArray(data) ? data : data.users || data.students || data.teachers || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title={title} 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateUser', { role })}
            />
            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${title.toLowerCase()}...`}
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
            </View>
            <Text style={styles.countText}>{filtered.length} {title}</Text>
            <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={color} />}
                ListEmptyComponent={<EmptyState icon="people-outline" title={`No ${title.toLowerCase()} found`} />}
                renderItem={({ item }) => {
                    const badge = badgeField ? item?.[role === 'Student' ? 'studentProfile' : 'teacherProfile']?.[badgeField] : null;
                    return (
                        <TouchableOpacity
                            style={styles.userCard}
                            onPress={() => navigateTo && navigation.navigate(navigateTo, { userId: item._id })}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.avatar, { backgroundColor: color }]}>
                                <Text style={styles.avatarText}>{item.name?.[0]}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.name}</Text>
                                <Text style={styles.userEmail}>{item.email}</Text>
                                {item.institute?.name && (
                                    <Text style={styles.userInstitute}>{item.institute.name}</Text>
                                )}
                            </View>
                            <View style={styles.userRight}>
                                {badge && <Badge label={badge} color={color} bg={bg} />}
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

// Students List
export const StudentsList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Student"
        title="Students"
        role="Student"
        color={colors.student}
        bg="#eef2ff"
        badgeField="subject"
        navigateTo="UserDetail"
    />
);

// Teachers List
export const TeachersList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Teacher"
        title="Teachers"
        role="Teacher"
        color={colors.teacher}
        bg="#ecfdf5"
        badgeField="subject"
        navigateTo="UserDetail"
    />
);

// Editors List
export const EditorsList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Editor"
        title="Editors"
        role="Editor"
        color={colors.accent}
        bg="#eef2ff"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

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
    userCard: {
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    userInfo: { flex: 1 },
    userName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    userEmail: { fontSize: fontSizes.xs, color: colors.textMuted },
    userInstitute: { fontSize: fontSizes.xs, color: colors.accent, fontWeight: '600', marginTop: 2 },
    userRight: { alignItems: 'flex-end', gap: 4 },
});
