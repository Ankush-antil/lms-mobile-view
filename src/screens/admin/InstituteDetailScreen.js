import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import axios from 'axios';
import { AppHeader, SectionCard, Badge, LoadingScreen } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const InstituteDetailScreen = ({ route, navigation }) => {
    const { instituteId } = route.params;
    const [institute, setInstitute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const fetchInstituteDetails = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/setup/institutes/${instituteId}`);
            setInstitute(data);
        } catch (e) {
            console.error('Error fetching institute details:', e);
            Alert.alert('Error', 'Institute details load nahi ho paye');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstituteDetails();
    }, [instituteId]);

    const handleUpdatePassword = async () => {
        if (!newPassword.trim()) {
            Alert.alert('Required', 'Please enter a password');
            return;
        }
        if (newPassword.length < 4) {
            Alert.alert('Invalid', 'Password must be at least 4 characters long');
            return;
        }
        try {
            setUpdatingPassword(true);
            await axios.put(`/setup/institutes/${instituteId}`, { password: newPassword.trim() });
            Alert.alert('Success', 'Institute portal password updated successfully!');
            setNewPassword('');
        } catch (e) {
            console.error('Institute password update error:', e);
            Alert.alert('Error', e.response?.data?.message || 'Password update failed');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Remove Institute',
            `Kya aap sach mein ${institute?.name || 'is institute'} ko delete karna chahte hain? Sabhi resources iske remove ho jayenge.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/setup/institutes/${instituteId}`);
                            Alert.alert('Success', 'Institute deleted successfully');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'Institute delete karne mein error aaya');
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <LoadingScreen />;
    if (!institute) return <Text style={styles.errorText}>Institute not found</Text>;

    const themeColor = colors.accent;
    const themeBg = '#eef2ff';

    return (
        <View style={styles.container}>
            <AppHeader title="Institute Details" showBack />
            
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Profile Banner */}
                <View style={styles.profileHeader}>
                    <View style={[styles.avatar, { backgroundColor: themeColor }]}>
                        <Text style={styles.avatarText}>{institute.name?.[0]?.toUpperCase() || 'I'}</Text>
                    </View>
                    <Text style={styles.name}>{institute.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: themeBg }]}>
                        <Ionicons name="business" size={14} color={themeColor} />
                        <Text style={[styles.roleText, { color: themeColor }]}>{institute.code}</Text>
                    </View>
                </View>

                {/* Account Details */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Institute Info</Text>
                    
                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Contact Email</Text>
                            <Text style={styles.infoValue}>{institute.contactEmail}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Address</Text>
                            <Text style={styles.infoValue}>{institute.address || 'Not provided'}</Text>
                        </View>
                    </View>
                </SectionCard>

                {/* Courses Offered */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Courses</Text>
                    <View style={styles.badgeContainer}>
                        {institute.courses && institute.courses.length > 0 ? (
                            institute.courses.map((c) => (
                                <Badge key={c._id} label={c.name} color={colors.warning} bg="#fef3c7" />
                            ))
                        ) : (
                            <Text style={styles.noCoursesText}>No Courses Created yet</Text>
                        )}
                    </View>
                </SectionCard>

                {/* Update Password */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Update Password</Text>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password for portal login"
                                placeholderTextColor={colors.textMuted}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={[styles.savePasswordBtn, { backgroundColor: themeColor }]} 
                        onPress={handleUpdatePassword}
                        activeOpacity={0.8}
                        disabled={updatingPassword}
                    >
                        {updatingPassword ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={16} color={colors.white} />
                                <Text style={styles.savePasswordText}>Save New Password</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </SectionCard>

                {/* Delete Button */}
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={handleDelete}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.white} />
                    <Text style={styles.deleteButtonText}>Delete Institute</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 40 },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        marginBottom: spacing.md,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.white,
    },
    name: {
        fontSize: fontSizes.xl + 2,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        borderRadius: borderRadius.full,
    },
    roleText: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: fontSizes.md + 1,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.borderLight,
        paddingBottom: spacing.xs,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: fontSizes.md,
        color: colors.text,
        fontWeight: '600',
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    noCoursesText: {
        color: colors.textMuted,
        fontSize: fontSizes.sm,
        fontStyle: 'italic',
    },
    deleteButton: {
        backgroundColor: colors.danger,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: 52,
        borderRadius: borderRadius.md,
        marginTop: spacing.xl,
        elevation: 3,
        shadowColor: colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    deleteButtonText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700',
    },
    errorText: {
        color: colors.danger,
        fontSize: fontSizes.md,
        textAlign: 'center',
        margin: spacing.xl,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    input: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
        marginLeft: 10,
    },
    savePasswordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: borderRadius.md,
        marginTop: spacing.xs,
        elevation: 1,
    },
    savePasswordText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700',
    },
});

export default InstituteDetailScreen;
