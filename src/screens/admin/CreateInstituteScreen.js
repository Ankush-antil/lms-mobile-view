import React, { useState } from 'react';
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

const CreateInstituteScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreateInstitute = async () => {
        if (!name.trim() || !code.trim() || !contactEmail.trim() || !password.trim()) {
            Alert.alert('Required Fields', 'Institute Name, Code, Contact Email, aur Password mandatory hain');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                address: address.trim(),
                contactEmail: contactEmail.trim().toLowerCase(),
                password: password,
            };

            await axios.post('/setup/institutes', payload);
            Alert.alert('Success', 'Institute created successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error creating institute:', error);
            Alert.alert('Error', error.response?.data?.message || 'Institute create karne mein problem aayi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Add New Institute" showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <SectionCard>
                    <Text style={styles.sectionTitle}>Institute Details</Text>

                    {/* Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Institute Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="business-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Digital Study Institute"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Code */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Institute Code *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. DSI001"
                                placeholderTextColor={colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    {/* Contact Email */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Contact Email *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. contact@dsi.com"
                                placeholderTextColor={colors.textMuted}
                                value={contactEmail}
                                onChangeText={setContactEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Portal Password *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter portal password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {/* Address */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Address</Text>
                        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter institute address"
                                placeholderTextColor={colors.textMuted}
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </SectionCard>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                    onPress={handleCreateInstitute}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                            <Text style={styles.submitBtnText}>Create Institute</Text>
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

export default CreateInstituteScreen;
