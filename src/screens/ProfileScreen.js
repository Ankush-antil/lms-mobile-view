import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AppHeader, LoadingScreen, SectionCard, Badge } from '../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
    const { user, logout, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProfile = async () => {
        try {
            const { data } = await axios.get('/users/profile');
            setProfile(data);
            setName(data.name || '');
            setPhone(data.mobileNumber || '');
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/users/profile', { name, mobileNumber: phone });
            await fetchProfile();
            await refreshUser();
            setEditing(false);
            Alert.alert('✅ Saved', 'Profile updated successfully!');
        } catch (e) {
            Alert.alert('Error', 'Could not update profile');
        } finally { setSaving(false); }
    };

    const getRoleColor = (role) => {
        if (role === 'Student') return colors.student;
        if (role === 'Teacher') return colors.teacher;
        if (role === 'Admin') return colors.admin;
        return colors.accent;
    };

    if (loading) return <LoadingScreen />;

    const roleColor = getRoleColor(profile?.role);

    return (
        <View style={styles.container}>
            <AppHeader
                title="My Profile"
                showBack
                rightIcon={editing ? 'close' : 'create-outline'}
                rightAction={() => setEditing(!editing)}
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} />}
            >
                {/* Profile Hero */}
                <View style={styles.profileHero}>
                    <View style={[styles.heroAvatar, { backgroundColor: roleColor }]}>
                        <Text style={styles.heroAvatarText}>{profile?.name?.[0]}</Text>
                    </View>
                    {editing ? (
                        <TextInput
                            style={styles.nameInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Full Name"
                            placeholderTextColor={colors.textMuted}
                        />
                    ) : (
                        <Text style={styles.heroName}>{profile?.name}</Text>
                    )}
                    <View style={styles.roleRow}>
                        <Badge label={profile?.role || 'User'} color={roleColor} bg={roleColor + '20'} />
                        {profile?.institute?.name && (
                            <Badge label={profile.institute.name} color={colors.textSecondary} bg={colors.bgSecondary} />
                        )}
                    </View>
                </View>

                {/* Contact Info */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <View style={styles.infoItem}>
                        <View style={[styles.infoIcon, { backgroundColor: '#eef2ff' }]}>
                            <Ionicons name="mail" size={16} color={colors.accent} />
                        </View>
                        <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{profile?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.infoItem}>
                        <View style={[styles.infoIcon, { backgroundColor: '#ecfdf5' }]}>
                            <Ionicons name="call" size={16} color={colors.teacher} />
                        </View>
                        <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>Phone</Text>
                            {editing ? (
                                <TextInput
                                    style={styles.editInput}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Phone number"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="phone-pad"
                                />
                            ) : (
                                <Text style={styles.infoValue}>{profile?.mobileNumber || 'Not set'}</Text>
                            )}
                        </View>
                    </View>
                </SectionCard>

                {/* Role-specific info */}
                {profile?.role === 'Student' && profile?.studentProfile && (
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Academic Info</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Subject</Text>
                                <Text style={styles.gridValue}>{profile.studentProfile.subject || 'N/A'}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Course</Text>
                                <Text style={styles.gridValue}>{profile.studentProfile.course?.name || 'N/A'}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Enrolled</Text>
                                <Text style={styles.gridValue}>
                                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Status</Text>
                                <Badge label="Active" color={colors.success} bg="#ecfdf5" />
                            </View>
                        </View>
                    </SectionCard>
                )}

                {profile?.role === 'Teacher' && profile?.teacherProfile && (
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Teaching Info</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Subjects</Text>
                                <Text style={styles.gridValue}>
                                    {profile.teacherProfile.subjects?.join(', ') || profile.teacherProfile.subject || 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Assigned Courses</Text>
                                <Text style={styles.gridValue}>
                                    {profile.teacherProfile.assignedCourses?.map(c => c.name || c).join(', ') || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {/* Save Button */}
                {editing && (
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving ? <ActivityIndicator color={colors.white} /> : (
                            <>
                                <Ionicons name="save" size={18} color={colors.white} />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingBottom: 40 },
    profileHero: {
        backgroundColor: colors.primary,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl + 8,
        alignItems: 'center',
        gap: spacing.sm,
    },
    heroAvatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    heroAvatarText: { fontSize: 38, fontWeight: '900', color: colors.white },
    nameInput: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: spacing.md,
        paddingBottom: 4,
        textAlign: 'center',
        minWidth: 200,
    },
    heroName: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.white },
    roleRow: { flexDirection: 'row', gap: 8 },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    infoIcon: {
        width: 38,
        height: 38,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: { flex: 1 },
    infoLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
    editInput: {
        fontSize: fontSizes.md,
        color: colors.text,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.accent,
        paddingVertical: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    gridItem: {
        width: '47%',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
    },
    gridLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
    gridValue: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accent,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: borderRadius.lg,
        paddingVertical: 15,
        elevation: 3,
    },
    saveBtnText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        paddingVertical: 15,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutBtnText: { color: colors.danger, fontSize: fontSizes.lg, fontWeight: '700' },
});

export default ProfileScreen;
