import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const ViewTestResult = ({ route, navigation }) => {
    const { submissionId } = route.params;
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/submissions/${submissionId}`)
            .then(({ data }) => setSubmission(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingScreen />;
    if (!submission) return null;

    const test = submission.test;
    const totalQ = submission.answers?.length || 0;
    const score = submission.totalScore ?? 0;
    const maxScore = submission.maxScore || totalQ;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const getGradeColor = (pct) => {
        if (pct >= 80) return colors.success;
        if (pct >= 60) return colors.warning;
        return colors.danger;
    };
    const gradeColor = getGradeColor(percentage);

    return (
        <View style={styles.container}>
            <AppHeader title="Test Result" showBack />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Score Banner */}
                <View style={[styles.scoreBanner, { borderColor: gradeColor }]}>
                    <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
                        <Text style={[styles.scorePercent, { color: gradeColor }]}>{percentage}%</Text>
                        <Text style={styles.scoreRaw}>{score} / {maxScore}</Text>
                    </View>
                    <Text style={styles.testName}>{test?.title || 'Test Result'}</Text>
                    <Text style={styles.testSubject}>{test?.subject}</Text>
                    <View style={styles.submittedRow}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.submittedText}>
                            {new Date(submission.submittedAt || submission.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* Answers Review */}
                <Text style={styles.sectionHeading}>Answer Review</Text>
                {submission.answers?.map((ans, i) => {
                    const q = ans.question || test?.questions?.[i];
                    const isCorrect = ans.isCorrect;
                    const hasScore = ans.score !== undefined;

                    return (
                        <SectionCard key={i} style={[
                            styles.answerCard,
                            hasScore && isCorrect && styles.correctCard,
                            hasScore && !isCorrect && styles.wrongCard,
                        ]}>
                            <View style={styles.answerHeader}>
                                <Text style={styles.qNum}>Q{i + 1}</Text>
                                {hasScore && (
                                    <View style={[styles.correctBadge, { backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2' }]}>
                                        <Ionicons
                                            name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                                            size={14}
                                            color={isCorrect ? colors.success : colors.danger}
                                        />
                                        <Text style={[styles.correctText, { color: isCorrect ? colors.success : colors.danger }]}>
                                            {isCorrect ? 'Correct' : 'Incorrect'}
                                        </Text>
                                    </View>
                                )}
                                {ans.score !== undefined && (
                                    <Text style={styles.answerScore}>{ans.score} pts</Text>
                                )}
                            </View>

                            {/* Question text */}
                            {q?.questionText?.includes('<') ? (
                                <WebView
                                    source={{ html: `<html><body style="font-size:26px;color:#0f172a;padding:4px;font-family:sans-serif;">${q.questionText}</body></html>` }}
                                    style={{ height: 80, marginBottom: 8 }}
                                    scrollEnabled={false}
                                />
                            ) : (
                                <Text style={styles.questionText}>{q?.questionText || ans.questionText}</Text>
                            )}

                            <View style={styles.answerDetail}>
                                <View style={styles.answerRow}>
                                    <Text style={styles.answerLabel}>Your Answer:</Text>
                                    <Text style={[styles.answerValue, !isCorrect && hasScore && { color: colors.danger }]}>
                                        {ans.answer || '(No answer)'}
                                    </Text>
                                </View>
                                {ans.correctAnswer && (
                                    <View style={styles.answerRow}>
                                        <Text style={styles.answerLabel}>Correct:</Text>
                                        <Text style={[styles.answerValue, { color: colors.success }]}>
                                            {ans.correctAnswer}
                                        </Text>
                                    </View>
                                )}
                                {ans.teacherComment && (
                                    <View style={styles.commentBox}>
                                        <Ionicons name="chatbubble-outline" size={13} color={colors.accent} />
                                        <Text style={styles.commentText}>{ans.teacherComment}</Text>
                                    </View>
                                )}
                            </View>
                        </SectionCard>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 32 },
    scoreBanner: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
        elevation: 3,
        borderWidth: 2,
    },
    scoreCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        backgroundColor: colors.bgSecondary,
    },
    scorePercent: {
        fontSize: fontSizes.xxxl,
        fontWeight: '900',
    },
    scoreRaw: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
    },
    testName: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    testSubject: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    submittedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    submittedText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    sectionHeading: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.md,
    },
    answerCard: { marginBottom: spacing.sm },
    correctCard: { borderColor: colors.success, borderWidth: 1.5 },
    wrongCard: { borderColor: colors.danger, borderWidth: 1.5 },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.sm,
    },
    qNum: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    correctBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    correctText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
    answerScore: {
        marginLeft: 'auto',
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.accent,
    },
    questionText: {
        fontSize: fontSizes.md,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
        marginBottom: spacing.sm,
    },
    answerDetail: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        gap: 6,
    },
    answerRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    answerLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textMuted,
        width: 90,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        paddingTop: 1,
    },
    answerValue: {
        flex: 1,
        fontSize: fontSizes.sm,
        color: colors.text,
        fontWeight: '600',
    },
    commentBox: {
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#eef2ff',
        padding: 8,
        borderRadius: borderRadius.sm,
        marginTop: 4,
    },
    commentText: {
        flex: 1,
        fontSize: fontSizes.xs,
        color: colors.accent,
        fontStyle: 'italic',
    },
});

export default ViewTestResult;
