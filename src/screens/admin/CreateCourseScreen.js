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
import { useAuth } from '../../context/AuthContext';

const CreateCourseScreen = ({ navigation }) => {
    const { user } = useAuth();
    const isInstitute = user?.role === 'Institute';

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [subjectsText, setSubjectsText] = useState('');
    
    const [institutes, setInstitutes] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showInstSelect, setShowInstSelect] = useState(false);

    useEffect(() => {
        const fetchInstitutes = async () => {
            try {
                const { data } = await axios.get('/setup/institutes');
                setInstitutes(data || []);

                if (isInstitute && user?.institute) {
                    const instId = typeof user.institute === 'object' ? user.institute._id : user.institute;
                    setSelectedInstitute(instId);
                }
            } catch (e) {
                console.error('Error fetching institutes:', e);
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchInstitutes();
    }, [isInstitute, user]);

    const handleCreateCourse = async () => {
        if (!name.trim() || !code.trim() || !selectedInstitute) {
            Alert.alert('Required Fields', 'Course Name, Course Code aur Institute select karna mandatory hai');
            return;
        }

        setSubmitting(true);
        try {
            // Split subjects by comma and trim
            const subjectsList = subjectsText
                ? subjectsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];

            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim(),
                institute: selectedInstitute,
                subjects: subjectsList
            };

            await axios.post('/setup/courses', payload);
            Alert.alert('Success', 'Course created successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error creating course:', error);
            Alert.alert('Error', error.response?.data?.message || 'Course create karne mein problem aayi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Add New Course" showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <SectionCard>
                    <Text style={styles.sectionTitle}>Course Details</Text>

                    {/* Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Course Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="book-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Web Development Bootcamp"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Code */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Course Code *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. WDB01"
                                placeholderTextColor={colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Description</Text>
                        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter course description"
                                placeholderTextColor={colors.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </SectionCard>

                <SectionCard style={styles.mt}>
                    <Text style={styles.sectionTitle}>Relations & Syllabus</Text>

                    {/* Institute Dropdown */}
                    {!isInstitute && (
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
                    )}

                    {/* Subjects list */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Subjects / Modules (Comma separated)</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. React, NodeJS, MongoDB"
                                placeholderTextColor={colors.textMuted}
                                value={subjectsText}
                                onChangeText={setSubjectsText}
                            />
                        </View>
                    </View>
                </SectionCard>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.warning }]}
                    onPress={handleCreateCourse}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                            <Text style={styles.submitBtnText}>Create Course</Text>
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
    textAreaWrapper: {
        height: 80,
        paddingVertical: 8,
        alignItems: 'flex-start',
    },
    input: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
        marginLeft: 10,
    },
    textArea: {
        marginLeft: 0,
        textAlignVertical: 'top',
        height: '100%',
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

export default CreateCourseScreen;
