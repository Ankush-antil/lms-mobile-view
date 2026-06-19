import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    BackHandler,
    Modal,
    Platform,
    Image,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, SectionCard } from '../../components/common/UIComponents';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Timer component
const Timer = ({ durationMinutes, onTimeUp }) => {
    const [seconds, setSeconds] = useState(durationMinutes * 60);
    const intervalRef = useRef(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    onTimeUp?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const isLow = seconds < 120;

    return (
        <View style={[styles.timer, isLow && styles.timerLow]}>
            <Ionicons name="time" size={14} color={isLow ? colors.danger : colors.white} />
            <Text style={[styles.timerText, isLow && styles.timerTextLow]}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
        </View>
    );
};

// ─── Question Wrapper (Handles Addons & Proctoring Simulations) ───────────────
const QuestionWrapper = ({ question, index, children, answer, onAnswer, onVoiceInput }) => {
    const [translated, setTranslated] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);
    const [calcVal, setCalcVal] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { text: "Hello! Main aapka AI helper hoon. Kya main is question mein aapki help karoon?", isUser: false }
    ]);
    const [aiInput, setAiInput] = useState('');

    const getTranslation = (text = '') => {
        const lower = text.toLowerCase();
        if (lower.includes('what is')) return 'क्या है?';
        if (lower.includes('explain')) return 'व्याख्या कीजिए';
        if (lower.includes('define')) return 'परिभाषा दीजिए';
        return '[Hindi Translation of the Question Prompt]';
    };

    const handleCalcPress = (char) => {
        if (char === 'C') {
            setCalcVal('');
        } else if (char === '=') {
            try {
                const result = new Function(`return ${calcVal.replace(/x/g, '*').replace(/÷/g, '/')}`)();
                setCalcVal(String(result));
            } catch (e) {
                setCalcVal('Error');
            }
        } else {
            setCalcVal(prev => prev + char);
        }
    };

    const handleSendAIMessage = () => {
        if (!aiInput.trim()) return;
        const userMsg = aiInput.trim();
        setAiMessages(prev => [...prev, { text: userMsg, isUser: true }]);
        setAiInput('');

        setTimeout(() => {
            let reply = "Mujhe lagta hai aapko question ke concepts ko dhyan se padhna chahiye. Ek baar keywords ko analyze kijiye.";
            setAiMessages(prev => [...prev, { text: reply, isUser: false }]);
        }, 1000);
    };

    const handleVoiceTyping = () => {
        Alert.alert('Voice Typing (Speech to Text)', 'Simulating voice input. Speak now...', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Insert Text',
                onPress: () => onVoiceInput?.(' [Voice Typed Text]')
            }
        ]);
    };

    const addons = question.addons || [];
    const qText = question.text || question.questionText || 'Question';

    return (
        <SectionCard style={styles.questionCard}>
            <View style={styles.qHeader}>
                <Text style={styles.questionNum}>Q{index + 1}</Text>
                
                {/* Addon icons */}
                <View style={styles.addonsRow}>
                    {addons.includes('Translator it') && (
                        <TouchableOpacity style={[styles.addonIconBtn, translated && styles.addonIconBtnActive]} onPress={() => setTranslated(!translated)}>
                            <Ionicons name="language" size={14} color={translated ? colors.white : colors.accent} />
                        </TouchableOpacity>
                    )}
                    {addons.includes('Calculator') && (
                        <TouchableOpacity style={styles.addonIconBtn} onPress={() => setShowCalculator(true)}>
                            <Ionicons name="calculator" size={14} color={colors.warning} />
                        </TouchableOpacity>
                    )}
                    {addons.includes('Help with AI') && (
                        <TouchableOpacity style={styles.addonIconBtn} onPress={() => setShowAIChat(true)}>
                            <Ionicons name="analytics" size={14} color={colors.success} />
                        </TouchableOpacity>
                    )}
                    {addons.includes('Voice typing') && (
                        <TouchableOpacity style={styles.addonIconBtn} onPress={handleVoiceTyping}>
                            <Ionicons name="mic" size={14} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {translated ? (
                <View style={styles.translatedContainer}>
                    <Text style={styles.translatedLabel}>Hindi Translation:</Text>
                    <Text style={styles.questionTextTranslated}>{getTranslation(qText)}</Text>
                </View>
            ) : (
                <Text style={styles.questionText}>{qText}</Text>
            )}

            {/* Render Question Element Content */}
            {children}

            {/* Proctoring Settings */}
            {question.moreSettings?.allowUpload && (
                <View style={styles.moreSettingsWidget}>
                    <Text style={styles.widgetLabel}>📎 Attachment Required:</Text>
                    <TouchableOpacity 
                        style={styles.attachmentBtn}
                        onPress={() => Alert.alert('Upload Attachment', 'File uploaded: project_doc.pdf')}
                    >
                        <Ionicons name="attach" size={16} color={colors.primary} />
                        <Text style={styles.attachmentBtnText}>Attach File</Text>
                    </TouchableOpacity>
                </View>
            )}

            {question.moreSettings?.allowAudioAnswer && (
                <View style={styles.moreSettingsWidget}>
                    <Text style={styles.widgetLabel}>🎤 Audio Response (Voice Answer):</Text>
                    <TouchableOpacity 
                        style={[styles.attachmentBtn, { borderColor: colors.danger }]}
                        onPress={() => Alert.alert('Voice Recorder', 'Simulated voice recording saved successfully.')}
                    >
                        <Ionicons name="mic-outline" size={16} color={colors.danger} />
                        <Text style={[styles.attachmentBtnText, { color: colors.danger }]}>Record Voice Response</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Calculator Modal */}
            <Modal visible={showCalculator} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.calcCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Calculator</Text>
                            <TouchableOpacity onPress={() => setShowCalculator(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.calcDisplay}>
                            <Text style={styles.calcDisplayText}>{calcVal || '0'}</Text>
                        </View>
                        <View style={styles.calcKeyboard}>
                            {[['7','8','9','÷'], ['4','5','6','x'], ['1','2','3','-'], ['0','.','C','+'], ['=']].map((row, rIdx) => (
                                <View key={rIdx} style={styles.calcRow}>
                                    {row.map((btn) => (
                                        <TouchableOpacity 
                                            key={btn} 
                                            style={[
                                                styles.calcBtn,
                                                btn === '=' && styles.calcBtnEqual,
                                                (btn === '+' || btn === '-' || btn === 'x' || btn === '÷') && styles.calcBtnOp,
                                                btn === 'C' && styles.calcBtnClear
                                            ]}
                                            onPress={() => handleCalcPress(btn)}
                                        >
                                            <Text style={[styles.calcBtnText, (btn === '=' || btn === 'C' || btn === '+' || btn === '-' || btn === 'x' || btn === '÷') && { color: colors.white }]}>{btn}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* AI Assistant Modal */}
            <Modal visible={showAIChat} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.aiCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>AI Teacher Helper</Text>
                            <TouchableOpacity onPress={() => setShowAIChat(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.aiChatBody}>
                            {aiMessages.map((m, idx) => (
                                <View key={idx} style={[styles.chatBubble, m.isUser ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                                    <Text style={[styles.chatText, m.isUser && { color: colors.white }]}>{m.text}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.aiChatInputRow}>
                            <TextInput 
                                style={styles.chatInput} 
                                placeholder="Ask AI a hint..." 
                                placeholderTextColor={colors.textMuted}
                                value={aiInput}
                                onChangeText={setAiInput}
                            />
                            <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendAIMessage}>
                                <Ionicons name="send" size={16} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SectionCard>
    );
};

// ─── TakeTestScreen Main ───────────────────────────────────────────────────────
const TakeTestScreen = ({ route, navigation }) => {
    const { testId } = route.params;
    const { callUser, endCall, callState } = useSocket();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const QUESTIONS_PER_PAGE = 2; // Split 24 elements into manageable pages

    // Simulated states for proctoring widgets
    const [activeCalling, setActiveCalling] = useState(null); // 'audio' or 'video'
    const [callConnected, setCallConnected] = useState(false);

    useEffect(() => {
        if (callState === 'connected') {
            setCallConnected(true);
        } else if (callState === 'idle') {
            setCallConnected(false);
            setActiveCalling(null);
        }
    }, [callState]);
    const [recordingAudio, setRecordingAudio] = useState(false);
    const [recordingVideo, setRecordingVideo] = useState(false);
    const [recordingScreen, setRecordingScreen] = useState(false);

    useEffect(() => {
        fetchTest();
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            Alert.alert('Exit Test?', 'Progress will be lost.', [
                { text: 'Stay', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
            ]);
            return true;
        });
        return () => backHandler.remove();
    }, []);

    const fetchTest = async () => {
        try {
            const { data } = await axios.get(`/tests/${testId}`);
            setTest(data);
        } catch (e) {
            Alert.alert('Error', 'Failed to load test');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [String(questionId)]: answer }));
    };

    const handleSubmit = () => {
        const totalQ = test?.questions?.length || 0;
        const answered = Object.keys(answers).length;
        Alert.alert(
            'Submit Test?',
            `You answered ${answered} of ${totalQ} questions. Submit now?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', style: 'default', onPress: submitTest },
            ]
        );
    };

    const submitTest = async () => {
        setSubmitting(true);
        try {
            const formattedAnswers = test.questions.map(q => {
                // Use String() to ensure consistent key matching — answers state uses string keys
                const qId = String(q._id);
                const rawAnswer = answers[qId];
                return {
                    questionId: qId,
                    questionText: q.questionText || q.text || 'Question',
                    questionType: q.type,
                    textAnswer: Array.isArray(rawAnswer)
                        ? rawAnswer.join(', ')
                        : (rawAnswer || ''),
                };
            });
            await axios.post('/submissions', {
                testId: test._id,
                answers: formattedAnswers,
            });
            Alert.alert('✅ Submitted!', 'Your test has been submitted successfully.', [
                { text: 'OK', onPress: () => navigation.navigate('StudentDashboard') },
            ]);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Submission failed. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingScreen />;
    if (!test) return null;

    const questions = test.questions || [];
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    const pageQuestions = questions.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE);
    const answeredCount = Object.keys(answers).length;
    const progress = questions.length > 0 ? answeredCount / questions.length : 0;

    return (
        <View style={styles.container}>
            {/* Custom Header with Timer */}
            <View style={styles.testHeader}>
                <View style={styles.testHeaderTop}>
                    <Text style={styles.testTitle} numberOfLines={1}>{test.title}</Text>
                    {test.settings?.duration && (
                        <Timer
                            durationMinutes={test.settings.duration}
                            onTimeUp={submitTest}
                        />
                    )}
                </View>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{answeredCount} / {questions.length} answered</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {pageQuestions.map((question, i) => {
                    const globalIndex = currentPage * QUESTIONS_PER_PAGE + i;
                    const type = question.type;
                    const curAns = answers[question._id];

                    return (
                        <QuestionWrapper
                            key={question._id}
                            question={question}
                            index={globalIndex}
                            answer={curAns}
                            onAnswer={(val) => handleAnswer(question._id, val)}
                            onVoiceInput={(simulatedText) => {
                                const currentText = curAns || '';
                                handleAnswer(question._id, currentText + simulatedText);
                            }}
                        >
                            {/* ─── 24 TYPES RENDERERS ─── */}

                            {/* 1. Short Answer */}
                            {(type === 'shortAnswer' || type === 'short_answer') && (
                                <TextInput
                                    style={styles.answerInput}
                                    placeholder="Type your short answer here..."
                                    placeholderTextColor={colors.textMuted}
                                    value={curAns || ''}
                                    onChangeText={(val) => handleAnswer(question._id, val)}
                                />
                            )}

                            {/* 2. Paragraph Answer */}
                            {type === 'paragraph' && (
                                <TextInput
                                    style={[styles.answerInput, { minHeight: 120 }]}
                                    placeholder="Type your detailed answer here..."
                                    placeholderTextColor={colors.textMuted}
                                    value={curAns || ''}
                                    onChangeText={(val) => handleAnswer(question._id, val)}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            )}

                            {/* 3. Multiple Choices */}
                            {type === 'mcq' && (
                                <View style={styles.optionsContainer}>
                                    {question.options?.map((optObj, idx) => {
                                        const opt = typeof optObj === 'string' ? optObj : optObj.text;
                                        const isSelected = curAns === opt;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.option, isSelected && styles.optionSelected]}
                                                onPress={() => handleAnswer(question._id, opt)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                                                    <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                                    {opt}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            {/* 4. Checkbox */}
                            {type === 'checkbox' && (
                                <View style={styles.optionsContainer}>
                                    {question.options?.map((optObj, idx) => {
                                        const opt = typeof optObj === 'string' ? optObj : optObj.text;
                                        const currentAnswers = Array.isArray(curAns) ? curAns : [];
                                        const isSelected = currentAnswers.includes(opt);
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.option, isSelected && styles.optionSelected]}
                                                onPress={() => {
                                                    if (isSelected) {
                                                        handleAnswer(question._id, currentAnswers.filter(x => x !== opt));
                                                    } else {
                                                        handleAnswer(question._id, [...currentAnswers, opt]);
                                                    }
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? colors.accent : colors.textSecondary} />
                                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                                    {opt}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            {/* 5. Dropdown */}
                            {type === 'dropdown' && (
                                <View style={styles.optionsContainer}>
                                    <Text style={styles.widgetLabel}>Select Option:</Text>
                                    {question.options?.map((optObj, idx) => {
                                        const opt = typeof optObj === 'string' ? optObj : optObj.text;
                                        const isSelected = curAns === opt;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.dropdownItemRow, isSelected && styles.dropdownSelectedRow]}
                                                onPress={() => handleAnswer(question._id, opt)}
                                            >
                                                <Text style={[styles.dropdownText, isSelected && { color: colors.white, fontWeight: '700' }]}>{opt}</Text>
                                                {isSelected && <Ionicons name="checkmark" size={16} color={colors.white} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            {/* 6. Date & Time */}
                            {type === 'dateTime' && (
                                <View style={styles.row}>
                                    <TextInput 
                                        style={[styles.answerInput, { flex: 1, marginRight: 8 }]}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={curAns?.split(' ')[0] || ''}
                                        onChangeText={(v) => handleAnswer(question._id, `${v} ${curAns?.split(' ')[1] || ''}`)}
                                    />
                                    <TextInput 
                                        style={[styles.answerInput, { flex: 1 }]}
                                        placeholder="HH:MM"
                                        placeholderTextColor={colors.textMuted}
                                        value={curAns?.split(' ')[1] || ''}
                                        onChangeText={(v) => handleAnswer(question._id, `${curAns?.split(' ')[0] || ''} ${v}`)}
                                    />
                                </View>
                            )}

                            {/* 7. Rating */}
                            {type === 'rating' && (
                                <View style={styles.ratingRow}>
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const isLit = star <= (parseInt(curAns) || 0);
                                        return (
                                            <TouchableOpacity key={star} onPress={() => handleAnswer(question._id, String(star))}>
                                                <Ionicons name={isLit ? 'star' : 'star-outline'} size={32} color={isLit ? colors.warning : colors.textMuted} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            {/* 8. File Upload */}
                            {type === 'fileUpload' && (
                                <View style={styles.fileUploadWidget}>
                                    <TouchableOpacity 
                                        style={styles.uploadBox}
                                        onPress={() => {
                                            Alert.prompt('Upload Simulation', 'Simulate file selection (enter file name):', [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Upload', onPress: (filename) => handleAnswer(question._id, filename || 'sheet.xlsx') }
                                            ]);
                                        }}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
                                        <Text style={styles.uploadBoxText}>
                                            {curAns ? `Attachment: ${curAns}` : 'Tap to select document'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 9. Image Displaying */}
                            {type === 'imageDisplay' && (
                                <View style={styles.imageDisplayContainer}>
                                    {question.imageUrl ? (
                                        <Image source={{ uri: question.imageUrl }} style={styles.displayImage} resizeMode="contain" />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                                            <Text style={styles.placeholderText}>Image display widget</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* 10. Video Displaying */}
                            {type === 'videoDisplay' && (
                                <View style={styles.videoWidget}>
                                    <Ionicons name="play-circle-outline" size={32} color={colors.primary} />
                                    <Text style={styles.videoWidgetText}>
                                        {question.videoUrl ? `Play video: ${question.videoUrl.split('/').pop()}` : 'Video Displaying element'}
                                    </Text>
                                    {question.videoUrl && (
                                        <TouchableOpacity style={styles.playBtn} onPress={() => Alert.alert('Playback', 'Simulating video playback...')}>
                                            <Text style={styles.playBtnText}>Play</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* 11. PDF Displaying */}
                            {type === 'pdfDisplay' && (
                                <View style={styles.pdfWidget}>
                                    <Ionicons name="document-text" size={24} color="#ef4444" />
                                    <Text style={styles.pdfWidgetText} numberOfLines={1}>
                                        {question.pdfUrl ? question.pdfUrl.split('/').pop() : 'Attached PDF Document'}
                                    </Text>
                                    <TouchableOpacity style={styles.openPdfBtn} onPress={() => Alert.alert('PDF Viewer', 'PDF opening simulation...')}>
                                        <Text style={styles.openPdfBtnText}>Open</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 12. Webpage Displaying */}
                            {type === 'webpageDisplay' && (
                                <View style={styles.webviewContainer}>
                                    {question.webpageUrl ? (
                                        <WebView source={{ uri: question.webpageUrl }} style={styles.questionWebview} />
                                    ) : (
                                        <Text style={styles.errorText}>No URL provided</Text>
                                    )}
                                </View>
                            )}

                            {/* 13. Embedded Video Displaying */}
                            {type === 'youtubeDisplay' && (
                                <View style={styles.webviewContainer}>
                                    {question.youtubeUrl ? (
                                        <WebView source={{ uri: question.youtubeUrl }} style={styles.questionWebview} />
                                    ) : (
                                        <Text style={styles.errorText}>No YouTube URL provided</Text>
                                    )}
                                </View>
                            )}

                            {/* 14. Embedded SM Content Displaying */}
                            {type === 'smDisplay' && (
                                <View style={styles.smWidget}>
                                    <Ionicons name="logo-twitter" size={20} color="#1d9bf0" />
                                    <Text style={styles.smWidgetText}>Social Media Embed Display</Text>
                                    <Text style={styles.smLink}>{question.smPostUrl || 'No post link set'}</Text>
                                </View>
                            )}

                            {/* 15. Audio listening Displaying */}
                            {type === 'audioDisplay' && (
                                <View style={styles.audioWidget}>
                                    <Ionicons name="headset-outline" size={28} color={colors.accent} />
                                    <View style={styles.audioControls}>
                                        <Text style={styles.audioTitle} numberOfLines={1}>{question.audioUrl ? question.audioUrl.split('/').pop() : 'Listen to Audio Track'}</Text>
                                        <View style={styles.progressBarWrapper}>
                                            <View style={styles.audioProgressTrack} />
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.audioPlayBtn} onPress={() => Alert.alert('Audio Player', 'Audio starting...')}>
                                        <Ionicons name="play" size={16} color={colors.white} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 16. Multi file Displaying */}
                            {type === 'multiFileDisplay' && (
                                <View style={styles.multiFileContainer}>
                                    <Text style={styles.widgetLabel}>Resources List:</Text>
                                    {question.multiFilesText ? (
                                        question.multiFilesText.split(',').map((url, idx) => (
                                            <View key={idx} style={styles.fileRow}>
                                                <Ionicons name="link-outline" size={14} color={colors.accent} />
                                                <Text style={styles.fileLinkText} numberOfLines={1}>{url.trim()}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.placeholderText}>No files attached</Text>
                                    )}
                                </View>
                            )}

                            {/* 17. Screenshot taking */}
                            {type === 'screenshot' && (
                                <View style={styles.proctorBox}>
                                    <Ionicons name="camera" size={24} color={colors.danger} />
                                    <Text style={styles.proctorText}>This element captures your screen proctoring log.</Text>
                                    <TouchableOpacity 
                                        style={styles.proctorBtn}
                                        onPress={() => {
                                            handleAnswer(question._id, 'screenshot_captured_ok');
                                            Alert.alert('Screenshot Captured', 'Simulated screenshot saved to student submission logs.');
                                        }}
                                    >
                                        <Text style={styles.proctorBtnText}>{curAns ? 'Recapture Screenshot' : 'Capture Screenshot'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 18. Screen recording */}
                            {type === 'screenRecord' && (
                                <View style={styles.proctorBox}>
                                    <Ionicons name="desktop" size={24} color={colors.danger} />
                                    <Text style={styles.proctorText}>Screen recording proctoring widget.</Text>
                                    <TouchableOpacity 
                                        style={[styles.proctorBtn, recordingScreen && { backgroundColor: colors.danger }]}
                                        onPress={() => {
                                            setRecordingScreen(!recordingScreen);
                                            handleAnswer(question._id, !recordingScreen ? 'screen_recording_started' : 'screen_recording_finished');
                                        }}
                                    >
                                        <Text style={styles.proctorBtnText}>{recordingScreen ? 'Stop Recording' : 'Start Screen Recording'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 19. Voice recording */}
                            {type === 'voiceRecord' && (
                                <View style={styles.proctorBox}>
                                    <Ionicons name="mic" size={24} color={colors.danger} />
                                    <Text style={styles.proctorText}>Audio response voice recording widget.</Text>
                                    <TouchableOpacity 
                                        style={[styles.proctorBtn, recordingAudio && { backgroundColor: colors.danger }]}
                                        onPress={() => {
                                            setRecordingAudio(!recordingAudio);
                                            handleAnswer(question._id, !recordingAudio ? 'audio_recording_started' : 'audio_response.mp3');
                                        }}
                                    >
                                        <Text style={styles.proctorBtnText}>{recordingAudio ? 'Stop Recording' : 'Record Voice Answer'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 20. Video recording */}
                            {type === 'videoRecord' && (
                                <View style={styles.proctorBox}>
                                    <Ionicons name="videocam" size={24} color={colors.danger} />
                                    <Text style={styles.proctorText}>Video response recording widget.</Text>
                                    <TouchableOpacity 
                                        style={[styles.proctorBtn, recordingVideo && { backgroundColor: colors.danger }]}
                                        onPress={() => {
                                            setRecordingVideo(!recordingVideo);
                                            handleAnswer(question._id, !recordingVideo ? 'video_recording_started' : 'video_response.mp4');
                                        }}
                                    >
                                        <Text style={styles.proctorBtnText}>{recordingVideo ? 'Stop Video' : 'Record Video Answer'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {/* 21, 22. Web based Audio / Video calling */}
                            {(type === 'audioCall' || type === 'videoCall') && (
                                <View style={styles.proctorBox}>
                                    <Ionicons name={type === 'audioCall' ? 'call' : 'videocam'} size={24} color={colors.accent} />
                                    <Text style={styles.proctorText}>
                                        {type === 'audioCall' ? 'Web-based Audio Calling Role Play' : 'Web-based Video Calling Interview Simulator'}
                                    </Text>
                                    {activeCalling === null ? (
                                        <TouchableOpacity 
                                            style={styles.proctorBtn}
                                            onPress={() => {
                                                setActiveCalling(type);
                                                const targetTeacherId = (test?.createdBy?._id || test?.createdBy || '6a34e6b4f498a0fe54642d54').toString();
                                                const callType = type === 'videoCall' ? 'video' : 'audio';
                                                callUser(targetTeacherId, 'Teacher', 'Teacher', callType);
                                                handleAnswer(question._id, `${type}_call_completed`);
                                            }}
                                        >
                                            <Text style={styles.proctorBtnText}>Connect Call</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.callPanel}>
                                            <View style={styles.pingDot} />
                                            <Text style={styles.callPanelText}>Connected ({activeCalling === 'videoCall' ? 'Video' : 'Audio'})</Text>
                                            <TouchableOpacity 
                                                style={styles.hangupBtn}
                                                onPress={() => {
                                                    endCall();
                                                }}
                                            >
                                                <Ionicons name="close" size={14} color={colors.white} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* 23. Text based AI agent */}
                            {type === 'textAIAgent' && (
                                <View style={styles.aiChatWidget}>
                                    <Text style={styles.widgetLabel}>🤖 AI Agent: {question.agentName || 'Tutor'}</Text>
                                    <Text style={styles.placeholderText}>{question.greetingMessage || 'Ask me any questions related to the topic.'}</Text>
                                    <TextInput 
                                        style={styles.answerInput}
                                        placeholder="Type message to AI agent..."
                                        placeholderTextColor={colors.textMuted}
                                        value={curAns || ''}
                                        onChangeText={(val) => handleAnswer(question._id, val)}
                                    />
                                </View>
                            )}

                            {/* 24. Voice based AI Agent */}
                            {type === 'voiceAIAgent' && (
                                <View style={styles.voiceAIWidget}>
                                    <Text style={styles.widgetLabel}>🗣️ Voice AI Agent: {question.agentName || 'Voice Bot'}</Text>
                                    <Text style={styles.placeholderText}>Voice Persona: {question.voicePersona || 'Default'}</Text>
                                    <TouchableOpacity 
                                        style={styles.voiceAIBtn}
                                        onPress={() => {
                                            handleAnswer(question._id, 'voice_chat_completed_ok');
                                            Alert.alert('Voice Agent', 'Voice simulation active. Waveform speaking...');
                                        }}
                                    >
                                        <Ionicons name="volume-high" size={24} color={colors.white} />
                                        <Text style={styles.voiceAIBtnText}>Speak with Voice AI Agent</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </QuestionWrapper>
                    );
                })}
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity
                    style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-back" size={18} color={currentPage === 0 ? colors.textMuted : colors.primary} />
                    <Text style={[styles.navBtnText, currentPage === 0 && { color: colors.textMuted }]}>Prev</Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicator}>{currentPage + 1} / {totalPages}</Text>

                {currentPage < totalPages - 1 ? (
                    <TouchableOpacity
                        style={styles.navBtn}
                        onPress={() => setCurrentPage(p => p + 1)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.navBtnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                                <Text style={styles.submitBtnText}>Submit</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    testHeader: {
        backgroundColor: colors.primary,
        paddingTop: 48,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    testHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    testTitle: {
        flex: 1,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.white,
        marginRight: spacing.sm,
    },
    timer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: borderRadius.full,
    },
    timerLow: { backgroundColor: '#fef2f2' },
    timerText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white, letterSpacing: 1 },
    timerTextLow: { color: colors.danger },
    progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 4 },
    progressFill: { height: 4, backgroundColor: colors.success, borderRadius: 2 },
    progressText: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.65)' },

    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 24 },
    questionCard: { marginBottom: spacing.md },
    qHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    questionNum: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
    addonsRow: { flexDirection: 'row', gap: 6 },
    addonIconBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    addonIconBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    questionText: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text, lineHeight: 22, marginBottom: spacing.md },
    translatedContainer: {
        marginBottom: spacing.md,
        backgroundColor: '#f8fafc',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    translatedLabel: { fontSize: fontSizes.xs - 1, color: colors.accent, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    questionTextTranslated: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text, lineHeight: 22 },

    optionsContainer: { gap: 8 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    optionSelected: { backgroundColor: '#eef2ff', borderColor: colors.accent },
    optionCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionCircleSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    optionLetter: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.textSecondary },
    optionLetterSelected: { color: colors.white },
    optionText: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    optionTextSelected: { color: colors.accent, fontWeight: '600' },
    answerInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.md,
        fontSize: fontSizes.md,
        color: colors.text,
        minHeight: 48,
    },

    row: { flexDirection: 'row' },
    ratingRow: { flexDirection: 'row', gap: 6 },
    tfButtons: { flexDirection: 'row', gap: spacing.md },
    tfBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    tfBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
    tfBtnActiveDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
    tfBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    tfBtnTextActive: { color: colors.white },

    // Dropdown row
    dropdownItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.sm + 2,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    dropdownSelectedRow: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    dropdownText: {
        fontSize: fontSizes.md,
        color: colors.text,
    },

    // Displays
    imageDisplayContainer: {
        height: 200,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    displayImage: {
        flex: 1,
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    placeholderText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
    },

    videoWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    videoWidgetText: {
        flex: 1,
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    playBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    playBtnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: fontSizes.xs,
    },

    pdfWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    pdfWidgetText: {
        flex: 1,
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    openPdfBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    openPdfBtnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: fontSizes.xs,
    },

    webviewContainer: {
        height: 240,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    questionWebview: { flex: 1 },

    smWidget: {
        backgroundColor: '#f8fafc',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    smWidgetText: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.text,
    },
    smLink: {
        fontSize: fontSizes.xs,
        color: colors.accent,
        marginTop: 4,
    },

    audioWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    audioControls: {
        flex: 1,
        gap: 4,
    },
    audioTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.text,
    },
    progressBarWrapper: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
    },
    audioProgressTrack: {
        width: '30%',
        height: 4,
        backgroundColor: colors.accent,
        borderRadius: 2,
    },
    audioPlayBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    multiFileContainer: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: 6,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fileLinkText: {
        fontSize: fontSizes.xs,
        color: colors.accent,
        flex: 1,
    },

    // Interactions
    proctorBox: {
        backgroundColor: '#fff5f5',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: '#fecaca',
        alignItems: 'center',
        gap: 8,
    },
    proctorText: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
    },
    proctorBtn: {
        backgroundColor: colors.danger,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
    },
    proctorBtnText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
    callPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
    },
    callPanelText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: fontSizes.xs,
    },
    pingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    hangupBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    aiChatWidget: {
        backgroundColor: '#f8fafc',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
        gap: 8,
    },
    voiceAIWidget: {
        backgroundColor: '#f0f9ff',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: '#bae6fd',
        alignItems: 'center',
        gap: 8,
    },
    voiceAIBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0288d1',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
    },
    voiceAIBtnText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: fontSizes.sm,
    },

    fileUploadWidget: { marginTop: 4 },
    uploadBox: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.border,
        padding: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadBoxText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },

    moreSettingsWidget: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        gap: 6,
    },
    widgetLabel: { fontSize: fontSizes.xs - 1, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    attachmentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 40,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    attachmentBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    calcCard: { width: '100%', maxWidth: 320, backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    modalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    calcDisplay: { backgroundColor: colors.bgSecondary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'flex-end', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
    calcDisplayText: { fontSize: 24, fontWeight: '700', color: colors.text },
    calcKeyboard: { gap: 6 },
    calcRow: { flexDirection: 'row', gap: 6 },
    calcBtn: { flex: 1, height: 46, borderRadius: borderRadius.md, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    calcBtnOp: { backgroundColor: colors.accent },
    calcBtnClear: { backgroundColor: colors.danger },
    calcBtnEqual: { backgroundColor: colors.success, flex: 2 },
    calcBtnText: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },

    aiCard: { width: '100%', height: '70%', backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, elevation: 5 },
    aiChatBody: { flex: 1, backgroundColor: '#f8fafc', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.md },
    chatBubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: borderRadius.md },
    chatBubbleAI: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0' },
    chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.accent },
    chatText: { fontSize: fontSizes.sm, color: colors.text },
    aiChatInputRow: { flexDirection: 'row', gap: 8 },
    chatInput: { flex: 1, height: 44, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: fontSizes.sm, color: colors.text, backgroundColor: colors.bgSecondary },
    chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

    bottomNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border, elevation: 4 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
    navBtnDisabled: { opacity: 0.4 },
    navBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.primary },
    pageIndicator: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textSecondary },
    submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: borderRadius.md, elevation: 2 },
    submitBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '700' },
    errorText: { fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center', padding: spacing.md },
});

export default TakeTestScreen;
