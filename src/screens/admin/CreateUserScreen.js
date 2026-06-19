import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import axios from 'axios';
import { AppHeader, SectionCard } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const CreateUserScreen = ({ navigation, route }) => {
    const defaultRole = route.params?.role || 'Student'; // Can be Student or Teacher
    const [role, setRole] = useState(defaultRole);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [studentSubject, setStudentSubject] = useState('');
    const [teacherSubjects, setTeacherSubjects] = useState('');
    
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Dropdown toggle states (since React Native Picker requires external library, we use custom simple dialogs or selects)
    const [showInstSelect, setShowInstSelect] = useState(false);
    const [showCourseSelect, setShowCourseSelect] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instRes, courseRes] = await Promise.all([
                    axios.get('/setup/institutes'),
                    axios.get('/setup/courses'),
                ]);
                setInstitutes(instRes.data || []);
                setCourses(courseRes.data || []);
            } catch (e) {
                console.error('Error fetching dropdowns:', e);
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateUser = async () => {
        if (!name.trim() || !email.trim() || !password.trim() || !selectedInstitute) {
            Alert.alert('Required Fields', 'Name, Email, Password aur Institute select karna mandatory hai');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                email: email.trim(),
                password: password,
                role: role,
                mobileNumber: mobileNumber.trim(),
                institute: selectedInstitute,
            };

            if (role === 'Student') {
                payload.course = selectedCourse || null;
                payload.subject = studentSubject.trim();
            } else {
                payload.course = selectedCourse || null;
                payload.subjects = teacherSubjects.trim(); // Controller expects comma-separated or array
            }

            await axios.post('/users', payload);
            Alert.alert('Success', `${role} created successfully!`);
            navigation.goBack();
        } catch (error) {
            console.error('Error creating user:', error);
            Alert.alert('Error', error.response?.data?.message || 'User create karne mein problem aayi.');
        } finally {
            setSubmitting(false);
        }
    };

    const activeColor = role === 'Student' ? colors.student : colors.teacher;

    return (
        <View style={styles.container}>
            <AppHeader title={`Add New ${role}`} showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Role Switcher */}
                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.roleTab,
                            role === 'Student' && { backgroundColor: colors.student, borderColor: colors.student }
                        ]}
                        onPress={() => setRole('Student')}
                    >
                        <Text style={[styles.roleTabText, role === 'Student' && styles.activeTabText]}>Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.roleTab,
                            role === 'Teacher' && { backgroundColor: colors.teacher, borderColor: colors.teacher }
                        ]}
                        onPress={() => setRole('Teacher')}
                    >
                        <Text style={[styles.roleTabText, role === 'Teacher' && styles.activeTabText]}>Teacher</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <SectionCard>
                    {/* Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter full name"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Password *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {/* Mobile */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile number"
                                placeholderTextColor={colors.textMuted}
                                value={mobileNumber}
                                onChangeText={setMobileNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                </SectionCard>

                {/* Organization Setup */}
                <SectionCard style={styles.mt}>
                    <Text style={styles.sectionTitle}>Profile & Setup</Text>

                    {/* Institute Dropdown */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Select Institute *</Text>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setShowInstSelect(!showInstSelect)}
                        >
                            <Text style={selectedInstitute ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                {institutes.find(i => i._id === selectedInstitute)?.name || 'Choose Institute'}
                            </Text>
                            <Ionicons name={showInstSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                        </TouchableOpacity>

                        {showInstSelect && (
                            <View style={styles.dropdownMenu}>
                                {loadingDropdowns ? (
                                    <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                ) : institutes.length > 0 ? (
                                    institutes.map(i => (
                                        <TouchableOpacity
                                            key={i._id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedInstitute(i._id);
                                                setShowInstSelect(false);
                                            }}
                                        >
                                            <Text style={styles.itemText}>{i.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noData}>No institutes found</Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Course Dropdown */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Assign Course</Text>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setShowCourseSelect(!showCourseSelect)}
                        >
                            <Text style={selectedCourse ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                {courses.find(c => c._id === selectedCourse)?.name || 'Choose Course'}
                            </Text>
                            <Ionicons name={showCourseSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                        </TouchableOpacity>

                        {showCourseSelect && (
                            <View style={styles.dropdownMenu}>
                                {loadingDropdowns ? (
                                    <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                ) : courses.length > 0 ? (
                                    courses.map(c => (
                                        <TouchableOpacity
                                            key={c._id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedCourse(c._id);
                                                setShowCourseSelect(false);
                                            }}
                                        >
                                            <Text style={styles.itemText}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noData}>No courses found</Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Subject (Student-specific) */}
                    {role === 'Student' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Primary Subject</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="library-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Mathematics"
                                    placeholderTextColor={colors.textMuted}
                                    value={studentSubject}
                                    onChangeText={setStudentSubject}
                                />
                            </View>
                        </View>
                    )}

                    {/* Subjects (Teacher-specific) */}
                    {role === 'Teacher' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Subjects Expertise (Comma separated)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Physics, Chemistry"
                                    placeholderTextColor={colors.textMuted}
                                    value={teacherSubjects}
                                    onChangeText={setTeacherSubjects}
                                />
                            </View>
                        </View>
                    )}
                </SectionCard>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: activeColor }]}
                    onPress={handleCreateUser}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                            <Text style={styles.submitBtnText}>Create {role}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 40 },
    roleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: 4,
        marginBottom: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    roleTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        borderRadius: borderRadius.md - 2,
    },
    roleTabText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.white,
    },
    sectionTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.borderLight,
        paddingBottom: spacing.xs,
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
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    dropdownPlaceholder: {
        fontSize: fontSizes.md,
        color: colors.textMuted,
    },
    dropdownSelected: {
        fontSize: fontSizes.md,
        color: colors.text,
        fontWeight: '600',
    },
    dropdownMenu: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginTop: 6,
        paddingVertical: 4,
        elevation: 4,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    itemText: {
        fontSize: fontSizes.md,
        color: colors.text,
    },
    noData: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        padding: spacing.md,
        textAlign: 'center',
    },
    pv: { paddingVertical: spacing.md },
    mt: { marginTop: spacing.md },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: borderRadius.md,
        marginTop: spacing.xl,
        elevation: 3,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700',
    },
});

export default CreateUserScreen;
