import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, SectionCard, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const EvaluatePage = ({ navigation }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [scores, setScores] = useState({});
    const [comments, setComments] = useState({});
    const [saving, setSaving] = useState(false);

    // Pre-fill scores/comments when a submission is selected (for re-evaluation)
    useEffect(() => {
        if (selected) {
            const preScores = {};
            const preComments = {};
            (selected.answers || []).forEach((ans, i) => {
                if (ans.marks !== undefined && ans.marks !== null) {
                    preScores[i] = String(ans.marks);
                }
                // Pre-fill last teacher comment from conversation
                const teacherMsg = [...(ans.conversation || [])]
                    .reverse()
                    .find(m => m.role === 'Teacher');
                if (teacherMsg) preComments[i] = teacherMsg.message;
            });
            setScores(preScores);
            setComments(preComments);
        } else {
            setScores({});
            setComments({});
        }
    }, [selected]);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/submissions');
            setSubmissions(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const saveEvaluation = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            // Backend controller reads 'marks' and 'feedback' (not 'score'/'comment')
            const answerEvals = selected.answers.map((ans, i) => ({
                questionId: ans.questionId || ans._id,
                marks: parseFloat(scores[i] || 0),
                feedback: comments[i] || '',
            }));
            const totalMarks = Object.values(scores).reduce((sum, v) => sum + parseFloat(v || 0), 0);
            await axios.put(`/submissions/${selected._id}/evaluate`, { answers: answerEvals, totalMarks });
            Alert.alert('✅ Saved', 'Evaluation saved successfully!');
            setSelected(null);
            fetchData();
        } catch (e) {
            console.error('Save evaluation error:', e?.response?.data || e.message);
            Alert.alert('Error', 'Could not save evaluation. ' + (e?.response?.data?.message || ''));
        } finally { setSaving(false); }
    };

    if (loading) return <LoadingScreen />;

    // Detail View
    if (selected) {
        return (
            <View style={styles.container}>
                <AppHeader
                    title="Evaluate Submission"
                    showBack
                    rightIcon="save-outline"
                    rightAction={saveEvaluation}
                />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <SectionCard>
                        <Text style={styles.evalStudentName}>{selected.student?.name}</Text>
                        <Text style={styles.evalTestName}>{selected.test?.title}</Text>
                    </SectionCard>

                    {selected.answers?.map((ans, i) => {
                        // Match by questionId first, fall back to position index
                        const testQuestions = selected.test?.questions || [];
                        const testQuestion = testQuestions.find(q =>
                            (q._id && String(q._id) === String(ans.questionId)) ||
                            (q.id && String(q.id) === String(ans.questionId))
                        ) || testQuestions[i];
                        const qText = ans.questionText || testQuestion?.questionText || testQuestion?.text || `Question ${i + 1}`;

                        // Determine student answer display
                        let stdAns = '(No answer)';
                        if (ans.textAnswer && ans.textAnswer.trim()) {
                            stdAns = ans.textAnswer;
                        } else if (ans.audioData) {
                            stdAns = '🎤 Audio answer recorded';
                        } else if (ans.videoData) {
                            stdAns = '🎥 Video answer recorded';
                        } else if (ans.answer) {
                            stdAns = ans.answer;
                        }

                        return (
                            <SectionCard key={i} style={styles.evalCard}>
                                <Text style={styles.qNum}>Q{i + 1}</Text>
                                <Text style={styles.questionText}>{qText}</Text>
                                <View style={styles.studentAnswerBox}>
                                    <Text style={styles.studentAnswerLabel}>Student's Answer:</Text>
                                    <Text style={styles.studentAnswer}>{stdAns}</Text>
                                </View>
                                <View style={styles.evalInputRow}>
                                    <View style={styles.scoreInput}>
                                        <Text style={styles.evalLabel}>Score</Text>
                                        <TextInput
                                            style={styles.evalScoreField}
                                            placeholder="0"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="numeric"
                                            value={scores[i]?.toString() || ''}
                                            onChangeText={v => setScores(prev => ({ ...prev, [i]: v }))}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.evalLabel}>Comment</Text>
                                        <TextInput
                                            style={styles.commentInput}
                                            placeholder="Add feedback..."
                                            placeholderTextColor={colors.textMuted}
                                            value={comments[i] || ''}
                                            onChangeText={v => setComments(prev => ({ ...prev, [i]: v }))}
                                        />
                                    </View>
                                </View>
                            </SectionCard>
                        );
                    })}

                    <TouchableOpacity style={styles.saveBtn} onPress={saveEvaluation} disabled={saving} activeOpacity={0.85}>
                        {saving ? <ActivityIndicator color={colors.white} /> : (
                            <>
                                <Ionicons name="save" size={18} color={colors.white} />
                                <Text style={styles.saveBtnText}>Save Evaluation</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // List View
    return (
        <View style={styles.container}>
            <AppHeader title="Evaluate Submissions" showBack />
            <FlatList
                data={submissions}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No submissions to evaluate" />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.subCard}
                        onPress={() => setSelected(item)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.subAvatar}>
                            <Text style={styles.subAvatarText}>{item.student?.name?.[0]}</Text>
                        </View>
                        <View style={styles.subInfo}>
                            <Text style={styles.subStudentName}>{item.student?.name}</Text>
                            <Text style={styles.subTestName}>{item.test?.title}</Text>
                            <Text style={styles.subDate}>{new Date(item.submittedAt || item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.subRight}>
                            {item.status === 'evaluated' ? (
                                <Badge label="Evaluated" color={colors.success} bg="#ecfdf5" />
                            ) : (
                                <Badge label="Pending" color={colors.warning} bg="#fef3c7" />
                            )}
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { padding: spacing.md, paddingBottom: 32 },
    subCard: {
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
    subAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.teacher,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    subInfo: { flex: 1 },
    subStudentName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    subTestName: { fontSize: fontSizes.sm, color: colors.textMuted },
    subDate: { fontSize: fontSizes.xs, color: colors.textMuted },
    subRight: { alignItems: 'flex-end', gap: 4 },
    evalStudentName: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
    evalTestName: { fontSize: fontSizes.md, color: colors.textSecondary },
    evalCard: { marginBottom: spacing.sm },
    qNum: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    questionText: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    studentAnswerBox: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    studentAnswerLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700', marginBottom: 4 },
    studentAnswer: { fontSize: fontSizes.md, color: colors.text },
    evalInputRow: { flexDirection: 'row', gap: spacing.sm },
    scoreInput: { width: 80 },
    evalLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    evalScoreField: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.sm,
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.accent,
        textAlign: 'center',
        height: 44,
    },
    commentInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.sm,
        fontSize: fontSizes.sm,
        color: colors.text,
        height: 44,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.teacher,
        borderRadius: borderRadius.lg,
        paddingVertical: 16,
        marginTop: spacing.md,
        elevation: 3,
    },
    saveBtnText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
});

export default EvaluatePage;
