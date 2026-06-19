import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { AppHeader, SectionCard, Badge, LoadingScreen } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const UserDetailScreen = ({ route, navigation }) => {
    const { userId } = route.params;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/users/${userId}`);
            setUser(data);
        } catch (e) {
            console.error('Error fetching user details:', e);
            Alert.alert('Error', 'User details load nahi ho paye');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const handleDelete = () => {
        Alert.alert(
            'Remove User',
            `Kya aap sach mein ${user?.name || 'is user'} ko delete karna chahte hain?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/users/${userId}`);
                            Alert.alert('Success', 'User deleted successfully');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'User delete karne mein error aaya');
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <LoadingScreen />;
    if (!user) return <Text style={styles.errorText}>User not found</Text>;

    const isStudent = user.role === 'Student';
    const themeColor = isStudent ? colors.student : colors.teacher;
    const themeBg = isStudent ? '#eef2ff' : '#ecfdf5';

    return (
        <View style={styles.container}>
            <AppHeader title="User Details" showBack />
            
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Profile Banner */}
                <View style={styles.profileHeader}>
                    <View style={[styles.avatar, { backgroundColor: themeColor }]}>
                        <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                    <Text style={styles.name}>{user.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: themeBg }]}>
                        <Ionicons 
                            name={isStudent ? 'person' : 'people'} 
                            size={14} 
                            color={themeColor} 
                        />
                        <Text style={[styles.roleText, { color: themeColor }]}>{user.role}</Text>
                    </View>
                </View>

                {/* Account Details */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    
                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoValue}>{user.email}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Mobile Number</Text>
                            <Text style={styles.infoValue}>{user.mobileNumber || 'Not provided'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Institute</Text>
                            <Text style={styles.infoValue}>{user.institute?.name || 'No Institute Assigned'}</Text>
                        </View>
                    </View>
                </SectionCard>

                {/* Student specific */}
                {isStudent && (
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Student Profile</Text>
                        
                        <View style={styles.infoRow}>
                            <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Course</Text>
                                <Text style={styles.infoValue}>
                                    {user.studentProfile?.course?.name || 'Not Enrolled in any Course'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="library-outline" size={18} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Primary Subject</Text>
                                <Text style={styles.infoValue}>{user.studentProfile?.subject || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Enrollment Date</Text>
                                <Text style={styles.infoValue}>
                                    {user.studentProfile?.enrollmentDate 
                                        ? new Date(user.studentProfile.enrollmentDate).toLocaleDateString()
                                        : 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {/* Teacher specific */}
                {!isStudent && (
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Teacher Profile</Text>

                        <View style={styles.infoRow}>
                            <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Assigned Courses</Text>
                                <View style={styles.badgeContainer}>
                                    {user.teacherProfile?.assignedCourses?.length > 0 ? (
                                        user.teacherProfile.assignedCourses.map((c) => (
                                            <Badge key={c._id} label={c.name} color={colors.teacher} bg="#ecfdf5" />
                                        ))
                                    ) : (
                                        <Text style={styles.infoValue}>No Courses Assigned</Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Subjects Expertises</Text>
                                <View style={styles.badgeContainer}>
                                    {user.teacherProfile?.subjects?.length > 0 ? (
                                        user.teacherProfile.subjects.map((sub, index) => (
                                            <Badge key={index} label={sub} color={colors.primary} bg="#eef2ff" />
                                        ))
                                    ) : (
                                        <Text style={styles.infoValue}>N/A</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {/* Delete Button */}
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={handleDelete}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.white} />
                    <Text style={styles.deleteButtonText}>Delete User Account</Text>
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
});

export default UserDetailScreen;
