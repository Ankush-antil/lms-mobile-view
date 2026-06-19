import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    ActivityIndicator,
    StatusBar,
    Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSizes, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Email aur password dono required hain');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await login(email.trim(), password);
            // Navigation is handled by AppNavigator based on user role
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Server se connect nahi ho pa raha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Top Banner */}
                <View style={styles.topBanner}>
                    <View style={styles.bannerDecor1} />
                    <View style={styles.bannerDecor2} />
                    <View style={styles.logoContainer}>
                        <Ionicons name="school" size={44} color={colors.white} />
                    </View>
                    <Text style={styles.bannerTitle}>Welcome to LMS</Text>
                    <Text style={styles.bannerSubtitle}>Login to access your account</Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sign In</Text>
                    <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={14} color={colors.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <>
                                <Text style={styles.loginBtnText}>Login</Text>
                                <Ionicons name="arrow-forward" size={18} color={colors.white} />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Role Hint Cards */}
                    <View style={styles.hintRow}>
                        <View style={[styles.hintChip, { backgroundColor: '#eef2ff' }]}>
                            <Ionicons name="person" size={12} color={colors.student} />
                            <Text style={[styles.hintText, { color: colors.student }]}>Student</Text>
                        </View>
                        <View style={[styles.hintChip, { backgroundColor: '#ecfdf5' }]}>
                            <Ionicons name="people" size={12} color={colors.teacher} />
                            <Text style={[styles.hintText, { color: colors.teacher }]}>Teacher</Text>
                        </View>
                        <View style={[styles.hintChip, { backgroundColor: '#fef2f2' }]}>
                            <Ionicons name="shield-checkmark" size={12} color={colors.admin} />
                            <Text style={[styles.hintText, { color: colors.admin }]}>Admin</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footer}>LMS Portal • v1.0.0</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        flexGrow: 1,
    },
    topBanner: {
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 40 : 80,
        paddingBottom: 50,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    bannerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    bannerDecor2: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(99,102,241,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    bannerTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    bannerSubtitle: {
        fontSize: fontSizes.sm,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 6,
        textAlign: 'center',
    },
    card: {
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginTop: -28,
        borderRadius: borderRadius.xl + 4,
        padding: spacing.lg,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    },
    cardTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fef2f2',
        borderRadius: borderRadius.md,
        padding: spacing.sm + 2,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        fontSize: fontSizes.sm,
        color: colors.danger,
        flex: 1,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
    },
    eyeBtn: {
        padding: 4,
    },
    loginBtn: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: spacing.sm,
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    loginBtnDisabled: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    hintRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    hintChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: borderRadius.full,
    },
    hintText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
    footer: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: fontSizes.xs,
        marginVertical: spacing.lg,
    },
});

export default LoginScreen;
