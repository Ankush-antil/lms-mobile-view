import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export const AppHeader = ({ title, showBack = false, rightAction, rightIcon }) => {
    const navigation = useNavigation();

    return (
        <View style={styles.header}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <View style={styles.headerContent}>
                {showBack ? (
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color={colors.white} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.logoMark}>
                        <Ionicons name="school" size={18} color={colors.white} />
                    </View>
                )}
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                {rightAction ? (
                    <TouchableOpacity onPress={rightAction} style={styles.rightBtn} activeOpacity={0.7}>
                        <Ionicons name={rightIcon || 'ellipsis-vertical'} size={20} color={colors.white} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 36 }} />
                )}
            </View>
        </View>
    );
};

export const StatCard = ({ title, value, icon, color = colors.accent, bg = '#eef2ff' }) => (
    <View style={[styles.statCard, { flex: 1 }]}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.statValue}>{value ?? '–'}</Text>
        <Text style={styles.statTitle}>{title}</Text>
    </View>
);

export const SectionCard = ({ children, style }) => (
    <View style={[styles.sectionCard, style]}>
        {children}
    </View>
);

export const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner}>
            <Ionicons name="school" size={36} color={colors.accent} />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
    </View>
);

export const EmptyState = ({ icon = 'document-outline', title = 'No data found', subtitle }) => (
    <View style={styles.emptyContainer}>
        <Ionicons name={icon} size={52} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{title}</Text>
        {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
);

export const Badge = ({ label, color = colors.accent, bg }) => (
    <View style={[styles.badge, { backgroundColor: bg || color + '20' }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 50,
        paddingBottom: 14,
        paddingHorizontal: spacing.md,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        flex: 1,
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoMark: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'flex-start',
        marginHorizontal: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    statValue: {
        fontSize: fontSizes.xxxl,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    statTitle: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingSpinner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: fontSizes.md,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: fontSizes.lg,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        textAlign: 'center',
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    badgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
