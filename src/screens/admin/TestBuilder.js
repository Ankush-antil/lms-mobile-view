import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform,
    KeyboardAvoidingView, Modal, StatusBar, Switch
} from 'react-native';
import axios from 'axios';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

// List of all 24 elements categorized
const allElements = [
    {
        category: 'Inputs & Forms',
        items: [
            { label: 'Short Answer', value: 'shortAnswer', icon: 'document-text-outline', color: colors.accent },
            { label: 'Paragraph Answer', value: 'paragraph', icon: 'menu-outline', color: colors.accent },
            { label: 'Multiple Choices', value: 'mcq', icon: 'list-outline', color: colors.accent },
            { label: 'Checkbox', value: 'checkbox', icon: 'checkbox-outline', color: colors.accent },
            { label: 'Dropdown', value: 'dropdown', icon: 'chevron-down-circle-outline', color: colors.accent },
            { label: 'Date & Time', value: 'dateTime', icon: 'calendar-outline', color: colors.accent },
            { label: 'Rating', value: 'rating', icon: 'star-outline', color: colors.accent },
            { label: 'File Upload', value: 'fileUpload', icon: 'cloud-upload-outline', color: colors.accent },
        ]
    },
    {
        category: 'Media & Display',
        items: [
            { label: 'Image Displaying', value: 'imageDisplay', icon: 'image-outline', color: colors.warning },
            { label: 'Video Displaying', value: 'videoDisplay', icon: 'film-outline', color: colors.warning },
            { label: 'PDF Displaying', value: 'pdfDisplay', icon: 'book-outline', color: colors.warning },
            { label: 'Webpage Displaying', value: 'webpageDisplay', icon: 'globe-outline', color: colors.warning },
            { label: 'Embedded Video (YouTube)', value: 'youtubeDisplay', icon: 'play-circle-outline', color: colors.warning },
            { label: 'Embedded SM Content', value: 'smDisplay', icon: 'share-social-outline', color: colors.warning },
            { label: 'Audio Listening', value: 'audioDisplay', icon: 'headset-outline', color: colors.warning },
            { label: 'Multi File Displaying', value: 'multiFileDisplay', icon: 'copy-outline', color: colors.warning },
        ]
    },
    {
        category: 'Interactions & AI',
        items: [
            { label: 'Screenshot Taking', value: 'screenshot', icon: 'camera-outline', color: colors.danger },
            { label: 'Screen Recording', value: 'screenRecord', icon: 'desktop-outline', color: colors.danger },
            { label: 'Voice Recording', value: 'voiceRecord', icon: 'mic-outline', color: colors.danger },
            { label: 'Video Recording', value: 'videoRecord', icon: 'radio-button-on-outline', color: colors.danger },
            { label: 'Audio Calling', value: 'audioCall', icon: 'call-outline', color: colors.danger },
            { label: 'Video Calling', value: 'videoCall', icon: 'videocam-outline', color: colors.danger },
            { label: 'Text Based AI Agent', value: 'textAIAgent', icon: 'chatbubble-ellipses-outline', color: colors.danger },
            { label: 'Voice Based AI Agent', value: 'voiceAIAgent', icon: 'volume-high-outline', color: colors.danger },
        ]
    }
];

// Flat list for easy lookups
const flatElements = allElements.reduce((acc, cat) => [...acc, ...cat.items], []);

// ─── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = ({ question, index, onUpdate, onDelete, onDuplicate }) => {
    const [expanded, setExpanded] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateField = (field, value) => onUpdate(index, { ...question, [field]: value });
    
    const updateOption = (i, value) => {
        const opts = [...(question.options || ['', '', '', ''])];
        opts[i] = value;
        updateField('options', opts);
    };

    const toggleMCQCorrect = (optText) => {
        updateField('correctAnswer', optText);
    };

    const toggleAddon = (addon) => {
        const currentAddons = question.addons || [];
        if (currentAddons.includes(addon)) {
            updateField('addons', currentAddons.filter(a => a !== addon));
        } else {
            updateField('addons', [...currentAddons, addon]);
        }
    };

    const toggleMoreSetting = (field) => {
        const currentSettings = question.moreSettings || {
            allowUpload: false,
            allowAudioAnswer: false,
            allowChat: false,
            allowVideo: false
        };
        updateField('moreSettings', {
            ...currentSettings,
            [field]: !currentSettings[field]
        });
    };

    const elementMeta = flatElements.find(e => e.value === question.type) || { label: question.type, icon: 'help-circle-outline', color: colors.primary };

    const addonsList = [
        { label: 'Timer', value: 'Timer', icon: 'time-outline' },
        { label: 'AI Help', value: 'Help with AI', icon: 'analytics-outline' },
        { label: 'Translator', value: 'Translator it', icon: 'language-outline' },
        { label: 'Voice Type', value: 'Voice typing', icon: 'mic-outline' },
        { label: 'Calculator', value: 'Calculator', icon: 'calculator-outline' },
    ];

    return (
        <View style={styles.qCard}>
            {/* Card Header */}
            <TouchableOpacity
                style={styles.qCardHeader}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.8}
            >
                <View style={styles.qNumberBadge}>
                    <Text style={styles.qNumber}>Q{index + 1}</Text>
                </View>
                <Text style={styles.qHeaderTitle} numberOfLines={1}>
                    {question.questionText || 'New Question element'}
                </Text>
                <View style={styles.qHeaderRight}>
                    <View style={[styles.qTypeBadge, { backgroundColor: '#eef2ff' }]}>
                        <Text style={[styles.qTypeText, { color: colors.accent }]}>
                            {elementMeta.label}
                        </Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.qCardBody}>
                    {question.type === 'shortAnswer' ? (
                        <View style={{ gap: spacing.sm }}>
                            {/* Header Action Toolbar (AI, Upload, Write) */}
                            <View style={styles.saHeaderToolbar}>
                                <TouchableOpacity style={styles.saHeaderBtn} activeOpacity={0.7}>
                                    <Ionicons name="sparkles" size={13} color={colors.white} />
                                    <Text style={styles.saHeaderBtnText}>Make it using AI</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saHeaderBtnOutline} activeOpacity={0.7}>
                                    <Ionicons name="cloud-upload-outline" size={13} color={colors.primary} />
                                    <Text style={styles.saHeaderBtnOutlineText}>Upload</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saHeaderBtnOutline} activeOpacity={0.7}>
                                    <Ionicons name="create-outline" size={13} color={colors.primary} />
                                    <Text style={styles.saHeaderBtnOutlineText}>Write</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Large Input style question text */}
                            <View style={styles.saInputWrapper}>
                                <TextInput
                                    style={styles.saTextInput}
                                    placeholder="Type your Text here"
                                    placeholderTextColor={colors.textMuted}
                                    value={question.questionText}
                                    onChangeText={v => updateField('questionText', v)}
                                    multiline
                                />
                                <TouchableOpacity style={styles.saMicBtn} activeOpacity={0.7}>
                                    <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Student Answer Box Row */}
                            <View style={styles.saAnswerBoxRow}>
                                <View style={styles.saAnswerBox}>
                                    <Text style={styles.saAnswerBoxPlaceholder}>Type your Answer here</Text>
                                </View>
                                <View style={styles.saEnableItRow}>
                                    <Text style={styles.saEnableItText}>ENABLE IT</Text>
                                    <Switch
                                        value={question.particulars?.enableAnswerBox !== false}
                                        onValueChange={val => {
                                            const particulars = question.particulars || {};
                                            updateField('particulars', { ...particulars, enableAnswerBox: val });
                                        }}
                                        trackColor={{ false: '#e2e8f0', true: colors.accent }}
                                    />
                                </View>
                            </View>

                            {/* Settings accordion */}
                            <TouchableOpacity
                                style={styles.saSettingsHeader}
                                onPress={() => setShowAdvanced(!showAdvanced)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.saSettingsTitle}>SHORT ANSWER SETTINGS</Text>
                                <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {showAdvanced && (
                                <View style={styles.saSettingsBody}>
                                    {/* Enable Text Style Row */}
                                    <View style={styles.saTextStyleRow}>
                                        <Text style={styles.saTextStyleText}>Enable Text Style</Text>
                                        <Switch
                                            value={question.particulars?.enableTextStyle || false}
                                            onValueChange={val => {
                                                const particulars = question.particulars || {};
                                                updateField('particulars', { ...particulars, enableTextStyle: val });
                                            }}
                                            trackColor={{ false: '#e2e8f0', true: colors.accent }}
                                        />
                                    </View>

                                    {/* Actions button list */}
                                    <View style={styles.saButtonsGrid}>
                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]} activeOpacity={0.7}>
                                            <Ionicons name="gift-outline" size={13} color="#db2777" />
                                            <Text style={[styles.saGridBtnText, { color: '#db2777' }]}>Addons</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]} activeOpacity={0.7}>
                                            <Ionicons name="options-outline" size={13} color="#16a34a" />
                                            <Text style={[styles.saGridBtnText, { color: '#16a34a' }]}>Controls</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]} activeOpacity={0.7}>
                                            <Ionicons name="text-outline" size={13} color={colors.textSecondary} />
                                            <Text style={[styles.saGridBtnText, { color: colors.textSecondary }]}>Tt</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridIconBtn, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]} onPress={() => onDuplicate(index)} activeOpacity={0.7}>
                                            <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridIconBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]} onPress={() => onDelete(index)} activeOpacity={0.7}>
                                            <Ionicons name="trash-outline" size={13} color={colors.danger} />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]} activeOpacity={0.7}>
                                            <Ionicons name="cog-outline" size={13} color="#d97706" />
                                            <Text style={[styles.saGridBtnText, { color: '#d97706' }]}>Advance</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }]} activeOpacity={0.7}>
                                            <Ionicons name="git-branch-outline" size={13} color="#0d9488" />
                                            <Text style={[styles.saGridBtnText, { color: '#0d9488' }]}>Logical</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.saGridBtn, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }]} activeOpacity={0.7}>
                                            <Ionicons name="shield-checkmark-outline" size={13} color="#475569" />
                                            <Text style={[styles.saGridBtnText, { color: '#475569' }]}>Validation</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            {/* Question Prompt */}
                            <Text style={styles.blockLabel}>Question Label / Display Text</Text>
                            <TextInput
                                style={styles.qTextInput}
                                placeholder="Enter label or question prompt here..."
                                placeholderTextColor={colors.textMuted}
                                value={question.questionText}
                                onChangeText={v => updateField('questionText', v)}
                                multiline
                            />
                        </>
                    )}

                    {/* DYNAMIC FIELDS FOR THE 24 ELEMENTS */}
                    
                    {/* 3, 4, 5. MCQ, Checkbox, Dropdown */}
                    {(question.type === 'mcq' || question.type === 'checkbox' || question.type === 'dropdown') && (
                        <View style={styles.optionsSection}>
                            <Text style={styles.optionsLabel}>Options Configuration</Text>
                            {(question.options || ['', '', '', '']).map((opt, i) => {
                                const isCorrect = question.type === 'checkbox'
                                    ? Array.isArray(question.correctAnswers) && question.correctAnswers.includes(opt) && opt !== ''
                                    : question.correctAnswer === opt && opt !== '';
                                
                                return (
                                    <View key={i} style={styles.optionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.correctCircle,
                                                isCorrect && styles.correctCircleActive,
                                            ]}
                                            onPress={() => {
                                                if (!opt) return;
                                                if (question.type === 'checkbox') {
                                                    const curCorrects = question.correctAnswers || [];
                                                    if (curCorrects.includes(opt)) {
                                                        updateField('correctAnswers', curCorrects.filter(c => c !== opt));
                                                    } else {
                                                        updateField('correctAnswers', [...curCorrects, opt]);
                                                    }
                                                } else {
                                                    toggleMCQCorrect(opt);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            {question.type === 'checkbox' ? (
                                                <Ionicons name={isCorrect ? 'checkbox' : 'square-outline'} size={16} color={isCorrect ? colors.white : colors.textSecondary} />
                                            ) : (
                                                <Text style={[styles.optionLetter, isCorrect && styles.optionLetterActive]}>
                                                    {String.fromCharCode(65 + i)}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TextInput
                                            style={[
                                                styles.optionInput,
                                                isCorrect && styles.optionInputCorrect,
                                            ]}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                            placeholderTextColor={colors.textMuted}
                                            value={opt}
                                            onChangeText={v => updateOption(i, v)}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* 7. Rating */}
                    {question.type === 'rating' && (
                        <View style={styles.tfSection}>
                            <Text style={styles.blockLabel}>Maximum Rating Value</Text>
                            <TextInput
                                style={styles.marksInput}
                                placeholder="5"
                                keyboardType="numeric"
                                value={question.ratingMax?.toString() || '5'}
                                onChangeText={v => updateField('ratingMax', parseInt(v) || 5)}
                            />
                        </View>
                    )}

                    {/* 8. File Upload */}
                    {question.type === 'fileUpload' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Max Allowed Files</Text>
                            <TextInput
                                style={styles.marksInput}
                                placeholder="1"
                                keyboardType="numeric"
                                value={question.multiMaxFiles?.toString() || '1'}
                                onChangeText={v => updateField('multiMaxFiles', parseInt(v) || 1)}
                            />
                        </View>
                    )}

                    {/* 9. Image Displaying */}
                    {question.type === 'imageDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Image URL (HTTPS) *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://example.com/image.png"
                                value={question.imageUrl || ''}
                                onChangeText={v => updateField('imageUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 10. Video Displaying */}
                    {question.type === 'videoDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Video URL (MP4, HTTPS) *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://example.com/video.mp4"
                                value={question.videoUrl || ''}
                                onChangeText={v => updateField('videoUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 11. PDF Displaying */}
                    {question.type === 'pdfDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>PDF Document URL (HTTPS) *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://example.com/document.pdf"
                                value={question.pdfUrl || ''}
                                onChangeText={v => updateField('pdfUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 12. Webpage Displaying */}
                    {question.type === 'webpageDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Webpage URL (HTTPS) *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://example.com"
                                value={question.webpageUrl || ''}
                                onChangeText={v => updateField('webpageUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 13. Embedded Video (YouTube) */}
                    {question.type === 'youtubeDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>YouTube Embed Link *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://www.youtube.com/embed/..."
                                value={question.youtubeUrl || ''}
                                onChangeText={v => updateField('youtubeUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 14. Embedded SM Content */}
                    {question.type === 'smDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Social Media Post URL *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="Twitter, Instagram, etc. URL"
                                value={question.smPostUrl || ''}
                                onChangeText={v => updateField('smPostUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 15. Audio Listening */}
                    {question.type === 'audioDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Audio Track URL (MP3, HTTPS) *</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://example.com/audio.mp3"
                                value={question.audioUrl || ''}
                                onChangeText={v => updateField('audioUrl', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 16. Multi File Displaying */}
                    {question.type === 'multiFileDisplay' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Multiple File URLs (Comma separated)</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="URL1, URL2, URL3"
                                value={question.multiFilesText || ''}
                                onChangeText={v => updateField('multiFilesText', v)}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 17. Screenshot configuration */}
                    {question.type === 'screenshot' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.blockLabel}>Scope (e.g. Window, Screen)</Text>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="Full Screen"
                                value={question.screenshotScope || ''}
                                onChangeText={v => updateField('screenshotScope', v)}
                            />
                        </View>
                    )}

                    {/* 18, 19, 20. Recording settings */}
                    {(question.type === 'screenRecord' || question.type === 'voiceRecord' || question.type === 'videoRecord') && (
                        <View style={styles.marksRow}>
                            <Text style={styles.marksLabel}>Max Duration (seconds)</Text>
                            <TextInput
                                style={styles.marksInput}
                                placeholder="60"
                                keyboardType="numeric"
                                value={question.recordDuration?.toString() || '60'}
                                onChangeText={v => updateField('recordDuration', parseInt(v) || 60)}
                            />
                        </View>
                    )}

                    {/* 21, 22. Audio / Video Calling */}
                    {(question.type === 'audioCall' || question.type === 'videoCall') && (
                        <View style={styles.optionsSection}>
                            <Text style={styles.blockLabel}>Scenario / Role play script</Text>
                            <TextInput
                                style={styles.qTextInput}
                                placeholder="Enter interview or calling script/role scenario..."
                                value={question.videoCallScenario || ''}
                                onChangeText={v => updateField('videoCallScenario', v)}
                            />
                            <View style={styles.marksRow}>
                                <Text style={styles.marksLabel}>Call Duration (minutes)</Text>
                                <TextInput
                                    style={styles.marksInput}
                                    placeholder="5"
                                    keyboardType="numeric"
                                    value={question.videoCallDuration?.toString() || '5'}
                                    onChangeText={v => updateField('videoCallDuration', parseInt(v) || 5)}
                                />
                            </View>
                        </View>
                    )}

                    {/* 23, 24. AI Agents */}
                    {(question.type === 'textAIAgent' || question.type === 'voiceAIAgent') && (
                        <View style={styles.optionsSection}>
                            <Text style={styles.blockLabel}>AI Agent Configuration</Text>
                            <TextInput
                                style={styles.optionInput}
                                placeholder="Agent Name (e.g. Einstein Bot)"
                                value={question.agentName || ''}
                                onChangeText={v => updateField('agentName', v)}
                            />
                            <TextInput
                                style={styles.optionInput}
                                placeholder="Greeting Message"
                                value={question.greetingMessage || ''}
                                onChangeText={v => updateField('greetingMessage', v)}
                            />
                            <TextInput
                                style={styles.qTextInput}
                                placeholder="System Persona instructions..."
                                value={question.systemPersona || ''}
                                onChangeText={v => updateField('systemPersona', v)}
                                multiline
                            />
                            {question.type === 'voiceAIAgent' && (
                                <TextInput
                                    style={styles.optionInput}
                                    placeholder="Voice Persona (e.g. Male-Siri)"
                                    value={question.voicePersona || ''}
                                    onChangeText={v => updateField('voicePersona', v)}
                                />
                            )}
                        </View>
                    )}

                    {/* Addons List */}
                    <View style={styles.addonsSection}>
                        <Text style={styles.blockLabel}>Enable Addons / Widgets</Text>
                        <View style={styles.addonsRow}>
                            {addonsList.map(a => {
                                const isEnabled = (question.addons || []).includes(a.value);
                                return (
                                    <TouchableOpacity
                                        key={a.value}
                                        style={[styles.addonPill, isEnabled && styles.addonPillActive]}
                                        onPress={() => toggleAddon(a.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={a.icon} size={13} color={isEnabled ? colors.white : colors.textSecondary} />
                                        <Text style={[styles.addonPillText, isEnabled && styles.addonPillTextActive]}>{a.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Advanced Settings */}
                    <TouchableOpacity
                        style={styles.advancedHeader}
                        onPress={() => setShowAdvanced(!showAdvanced)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.advancedTitle}>More Settings / Assistive Features</Text>
                        <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                    </TouchableOpacity>

                    {showAdvanced && (
                        <View style={styles.advancedBody}>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Allow Upload Attachment</Text>
                                <Switch
                                    value={question.moreSettings?.allowUpload || false}
                                    onValueChange={() => toggleMoreSetting('allowUpload')}
                                    trackColor={{ false: '#e2e8f0', true: colors.accent }}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Allow Voice Response</Text>
                                <Switch
                                    value={question.moreSettings?.allowAudioAnswer || false}
                                    onValueChange={() => toggleMoreSetting('allowAudioAnswer')}
                                    trackColor={{ false: '#e2e8f0', true: colors.accent }}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Allow Video Response</Text>
                                <Switch
                                    value={question.moreSettings?.allowVideo || false}
                                    onValueChange={() => toggleMoreSetting('allowVideo')}
                                    trackColor={{ false: '#e2e8f0', true: colors.accent }}
                                />
                            </View>
                        </View>
                    )}


                    {/* Actions */}
                    <View style={styles.qActions}>
                        <TouchableOpacity style={styles.qActionBtn} onPress={() => onDuplicate(index)} activeOpacity={0.8}>
                            <Ionicons name="copy-outline" size={15} color={colors.accent} />
                            <Text style={[styles.qActionText, { color: colors.accent }]}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.qActionBtn, styles.qDeleteBtn]} onPress={() => onDelete(index)} activeOpacity={0.8}>
                            <Ionicons name="trash-outline" size={15} color={colors.danger} />
                            <Text style={[styles.qActionText, { color: colors.danger }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Test Builder Main ─────────────────────────────────────────────────────────
const TestBuilder = ({ route, navigation }) => {
    const [testTitle, setTestTitle] = useState('');
    const [subject, setSubject] = useState('React');
    const [duration, setDuration] = useState('30');
    const [activity, setActivity] = useState('Quiz');
    const [institute, setInstitute] = useState('Digital Study Institute');
    const [course, setCourse] = useState('Web Development Bootcamp');
    const [publishMode, setPublishMode] = useState('connected'); // 'connected' | 'public'
    const [questions, setQuestions] = useState([]);
    const [saving, setSaving] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false); // Add Element Sheet
    const [activeTab, setActiveTab] = useState(0); // 0: Forms, 1: Media, 2: AI
    const scrollRef = useRef(null);

    // New Publish Options States
    const [publishModalVisible, setPublishModalVisible] = useState(false);
    const [connectInstitute, setConnectInstitute] = useState('Digital Study Institute');
    const [connectCourse, setConnectCourse] = useState('Web Development Bootcamp');
    const [connectSubject, setConnectSubject] = useState('React');
    const [connectActivity, setConnectActivity] = useState('Quiz');
    const [connectIndex, setConnectIndex] = useState('Index 1');
    const [connectDate, setConnectDate] = useState(new Date().toISOString().split('T')[0]);
    const [connectTestName, setConnectTestName] = useState('');

    const [publicPassword, setPublicPassword] = useState('');
    const [publicTimeLimit, setPublicTimeLimit] = useState('60');
    const [publicRandomize, setPublicRandomize] = useState(false);
    const [publicRetake, setPublicRetake] = useState(false);
    const [publicShowScore, setPublicShowScore] = useState(true);
    const [publicShowAnswers, setPublicShowAnswers] = useState(false);
    const [publicOneResponse, setPublicOneResponse] = useState(false);

    const [institutesList, setInstitutesList] = useState([]);
    const [coursesList, setCoursesList] = useState([]);

    const fetchSetupData = async () => {
        try {
            const [instRes, courseRes] = await Promise.all([
                axios.get('/setup/institutes'),
                axios.get('/setup/courses')
            ]);
            setInstitutesList(instRes.data || []);
            setCoursesList(courseRes.data || []);
        } catch (e) {
            console.log('Error fetching setup data:', e);
        }
    };

    useEffect(() => {
        if (publishModalVisible) {
            fetchSetupData();
        }
    }, [publishModalVisible]);

    useEffect(() => {
        if (route.params?.testId) {
            const fetchTestDetails = async () => {
                try {
                    const { data } = await axios.get(`/tests/${route.params.testId}`);
                    if (data) {
                        setTestTitle(data.title || data.testDetails?.title || '');
                        setSubject(data.subject || 'React');
                        setDuration(String(data.settings?.duration || '30'));
                        setActivity(data.activity || 'Quiz');
                        setInstitute(data.institute || 'Digital Study Institute');
                        setCourse(data.course || 'Web Development Bootcamp');
                        setPublishMode(data.publishMode || 'connected');

                        // Pre-populate Publish Options
                        setConnectInstitute(data.institute || data.testDetails?.institute || 'Digital Study Institute');
                        setConnectCourse(data.course || data.testDetails?.course || 'Web Development Bootcamp');
                        setConnectSubject(data.subject || data.testDetails?.subject || 'React');
                        setConnectActivity(data.activity || data.testDetails?.activity || 'Quiz');
                        setConnectIndex(data.index || data.testDetails?.index || 'Index 1');
                        setConnectDate(data.date || data.testDetails?.date || new Date().toISOString().split('T')[0]);
                        setConnectTestName(data.title || data.testDetails?.title || '');

                        const pubSettings = data.publicSettings || data.testDetails?.publicSettings || {};
                        setPublicPassword(pubSettings.password || '');
                        setPublicTimeLimit(String(pubSettings.timeLimit || data.settings?.duration || '60'));
                        setPublicRandomize(!!pubSettings.randomizeQuestions);
                        setPublicRetake(!!pubSettings.allowRetake);
                        setPublicShowScore(pubSettings.showScoreAfterSubmission !== false);
                        setPublicShowAnswers(!!pubSettings.showCorrectAnswers);
                        setPublicOneResponse(!pubSettings.allowMultiple);
                        
                        // Map questions to match our state structure
                        const mappedQuestions = (data.questions || []).map(q => {
                            const optTextArray = (q.options || []).map(o => o.text || o);
                            const correctOpts = (q.options || []).filter(o => o.isCorrect).map(o => o.text || o);
                            const correctAnswerText = (q.options || []).find(o => o.isCorrect)?.text || q.correctAnswer || '';
                            
                            return {
                                _id: q._id,
                                type: q.type,
                                questionText: q.questionText || q.text || '',
                                options: optTextArray.length > 0 ? optTextArray : (q.type === 'mcq' || q.type === 'checkbox' || q.type === 'dropdown') ? ['', '', '', ''] : [],
                                correctAnswer: correctAnswerText,
                                correctAnswers: correctOpts,
                                addons: q.addons || [],
                                particulars: q.particulars || {
                                    enableAnswerBox: true,
                                    enableTextStyle: false
                                },
                                moreSettings: q.moreSettings || {
                                    allowUpload: false,
                                    allowAudioAnswer: false,
                                    allowChat: false,
                                    allowVideo: false
                                },
                                marks: q.marks || 1,
                                ratingMax: q.ratingMax || 5,
                                imageUrl: q.imageUrl || '',
                                videoUrl: q.videoUrl || '',
                                pdfUrl: q.pdfUrl || '',
                                webpageUrl: q.webpageUrl || '',
                                youtubeUrl: q.youtubeUrl || '',
                                smPostUrl: q.smPostUrl || '',
                                audioUrl: q.audioUrl || '',
                                multiMaxFiles: q.multiMaxFiles || 1,
                                screenshotScope: q.screenshotScope || '',
                                recordDuration: q.recordDuration || 60,
                                videoCallScenario: q.videoCallScenario || '',
                                videoCallDuration: q.videoCallDuration || 5,
                                agentName: q.agentName || '',
                                greetingMessage: q.greetingMessage || '',
                                systemPersona: q.systemPersona || '',
                                voicePersona: q.voicePersona || '',
                            };
                        });
                        setQuestions(mappedQuestions);
                    }
                } catch (e) {
                    console.error("Failed to fetch test details", e);
                    Alert.alert('Error', 'Failed to load test for editing.');
                }
            };
            fetchTestDetails();
        }
    }, [route.params?.testId]);

    const addQuestion = (type) => {
        const newQ = {
            type,
            questionText: '',
            options: (type === 'mcq' || type === 'checkbox' || type === 'dropdown') ? ['', '', '', ''] : [],
            correctAnswer: '',
            correctAnswers: [],
            addons: [],
            particulars: {
                enableAnswerBox: true,
                enableTextStyle: false
            },
            moreSettings: {
                allowUpload: false,
                allowAudioAnswer: false,
                allowChat: false,
                allowVideo: false
            },
            marks: 1,
        };
        setQuestions(prev => [...prev, newQ]);
        setPickerOpen(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    };

    const updateQuestion = (index, updated) => {
        setQuestions(prev => prev.map((q, i) => i === index ? updated : q));
    };

    const deleteQuestion = (index) => {
        Alert.alert('Delete Question?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => setQuestions(prev => prev.filter((_, i) => i !== index)) },
        ]);
    };

    const duplicateQuestion = (index) => {
        const dup = JSON.parse(JSON.stringify(questions[index]));
        const newList = [...questions];
        newList.splice(index + 1, 0, dup);
        setQuestions(newList);
    };

    const handlePublishPress = () => {
        if (!testTitle.trim()) { Alert.alert('Error', 'Test title required'); return; }
        if (questions.length === 0) { Alert.alert('Error', 'Add at least one question'); return; }
        
        if (!connectTestName) {
            setConnectTestName(testTitle);
        }
        
        setPublishModalVisible(true);
    };

    const handleSave = async () => {
        if (!testTitle.trim()) { Alert.alert('Error', 'Test title required'); return; }
        if (questions.length === 0) { Alert.alert('Error', 'Add at least one question'); return; }

        setSaving(true);
        try {
            const payloadQuestions = questions.map(q => {
                const mappedOptions = (q.type === 'mcq' || q.type === 'checkbox' || q.type === 'dropdown') 
                    ? q.options.map(opt => {
                        const isCorrect = q.type === 'checkbox'
                            ? Array.isArray(q.correctAnswers) && q.correctAnswers.includes(opt) && opt !== ''
                            : q.correctAnswer === opt && opt !== '';
                        return { text: opt, isCorrect };
                      })
                    : [];

                return {
                    text: q.questionText,
                    questionText: q.questionText,
                    type: q.type,
                    options: mappedOptions,
                    correctAnswer: q.correctAnswer,
                    correctAnswers: q.correctAnswers || [],
                    addons: q.addons || [],
                    particulars: q.particulars || {
                        enableAnswerBox: true,
                        enableTextStyle: false
                    },
                    moreSettings: q.moreSettings || {
                        allowUpload: false,
                        allowAudioAnswer: false,
                        allowChat: false,
                        allowVideo: false
                    },
                    ratingMax: q.ratingMax || 5,
                    imageUrl: q.imageUrl || '',
                    videoUrl: q.videoUrl || '',
                    pdfUrl: q.pdfUrl || '',
                    webpageUrl: q.webpageUrl || '',
                    youtubeUrl: q.youtubeUrl || '',
                    smPostUrl: q.smPostUrl || '',
                    audioUrl: q.audioUrl || '',
                    multiMaxFiles: q.multiMaxFiles || 1,
                    screenshotScope: q.screenshotScope || '',
                    recordDuration: q.recordDuration || 60,
                    videoCallScenario: q.videoCallScenario || '',
                    videoCallDuration: q.videoCallDuration || 5,
                    agentName: q.agentName || '',
                    greetingMessage: q.greetingMessage || '',
                    systemPersona: q.systemPersona || '',
                    voicePersona: q.voicePersona || '',
                    marks: q.marks || 1,
                };
            });

            const details = publishMode === 'connected' ? {
                title: connectTestName || testTitle,
                subject: connectSubject,
                activity: connectActivity,
                institute: connectInstitute,
                course: connectCourse,
                publishMode: 'connected',
                status: 'active',
                date: connectDate,
                index: connectIndex
            } : {
                title: connectTestName || testTitle,
                subject: 'General',
                activity: 'Quiz',
                institute: 'Public Web',
                course: 'Public Access',
                publishMode: 'public',
                status: 'active',
                date: connectDate,
                index: 'Public Index',
                publicSettings: {
                    allowMultiple: !publicOneResponse,
                    timeLimit: parseInt(publicTimeLimit) || 60,
                    randomizeQuestions: publicRandomize,
                    showScoreAfterSubmission: publicShowScore,
                    showCorrectAnswers: publicShowAnswers,
                    allowRetake: publicRetake,
                    password: publicPassword,
                    emailNotification: {
                        sendSubmissionNotification: true,
                        sendScoreEmail: true,
                        sendConfirmationEmail: true
                    }
                }
            };

            const testSettings = {
                duration: publishMode === 'connected' ? (parseInt(duration) || 30) : (parseInt(publicTimeLimit) || 60),
                passingMarks: 40
            };

            if (route.params?.testId) {
                await axios.put(`/tests/${route.params.testId}`, {
                    testDetails: details,
                    settings: testSettings,
                    questions: payloadQuestions,
                });
            } else {
                await axios.post('/tests', {
                    testDetails: details,
                    settings: testSettings,
                    questions: payloadQuestions,
                });
            }
            
            setPublishModalVisible(false);
            Alert.alert('✅ Published!', 'Test has been published successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to save test');
        } finally {
            setSaving(false);
        }
    };

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.white} />
                </TouchableOpacity>
                <View style={styles.topBarCenter}>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Test Title..."
                        placeholderTextColor="rgba(255,255,255,0.45)"
                        value={testTitle}
                        onChangeText={setTestTitle}
                    />
                </View>
                <TouchableOpacity
                    style={styles.topBarBtn}
                    onPress={() => setSettingsOpen(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="settings-outline" size={20} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveTopBtn, saving && { opacity: 0.7 }]}
                    onPress={handlePublishPress}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload" size={14} color={colors.white} />
                            <Text style={styles.saveTopBtnText}>Publish</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <View style={styles.statPill}>
                    <Ionicons name="help-circle" size={13} color={colors.accent} />
                    <Text style={styles.statPillText}>{questions.length} Elements</Text>
                </View>
                <View style={styles.statPill}>
                    <Ionicons name="time" size={13} color={colors.success} />
                    <Text style={styles.statPillText}>{duration} min</Text>
                </View>
                {subject ? (
                    <View style={styles.statPill}>
                        <Ionicons name="book" size={13} color={colors.teacher} />
                        <Text style={styles.statPillText}>{subject}</Text>
                    </View>
                ) : null}
            </View>

            {/* Questions Canvas */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={120}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.questionsArea}
                    contentContainerStyle={styles.questionsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {questions.length === 0 && (
                        <View style={styles.emptyCanvas}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="apps-outline" size={48} color={colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>Blank Canvas</Text>
                            <Text style={styles.emptySubtitle}>Niche "+" button par tap karke 24 elements mein se koi bhi element add karein.</Text>
                        </View>
                    )}
                    {questions.map((q, i) => (
                        <QuestionCard
                            key={i}
                            question={q}
                            index={i}
                            onUpdate={updateQuestion}
                            onDelete={deleteQuestion}
                            onDuplicate={duplicateQuestion}
                        />
                    ))}
                    <View style={{ height: 120 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Elements Footer Toolbar (24 Types) */}
            <View style={styles.footerPanel}>
                <View style={styles.footerTabs}>
                    {allElements.map((cat, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.footerTab, activeTab === idx && styles.footerTabActive]}
                            onPress={() => setActiveTab(idx)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.footerTabText, activeTab === idx && styles.footerTabTextActive]}>
                                {cat.category === 'Interactions & AI' 
                                    ? 'AI & Call' 
                                    : cat.category.replace('Inputs & ', '').replace(' & Display', '')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {/* Clear Button */}
                    <TouchableOpacity 
                        style={styles.clearBtnFooter}
                        onPress={() => {
                            if (questions.length === 0) return;
                            Alert.alert('Clear Canvas?', 'Delete all elements?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: () => setQuestions([]) },
                            ]);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.footerItemsScroll}
                >
                    {allElements[activeTab].items.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={styles.footerItemCard}
                            onPress={() => addQuestion(item.value)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.footerItemIconContainer, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon} size={16} color={item.color} />
                            </View>
                            <Text style={styles.footerItemLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Test Settings Modal */}
            <Modal
                visible={settingsOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setSettingsOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Test Settings</Text>
                            <TouchableOpacity onPress={() => setSettingsOpen(false)} activeOpacity={0.8}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsForm}>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Subject</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    placeholder="e.g., Mathematics"
                                    placeholderTextColor={colors.textMuted}
                                    value={subject}
                                    onChangeText={setSubject}
                                />
                            </View>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Activity / Category</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    placeholder="e.g., Chapter 1 Test"
                                    placeholderTextColor={colors.textMuted}
                                    value={activity}
                                    onChangeText={setActivity}
                                />
                            </View>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Institute</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    placeholder="e.g., Digital Study Institute"
                                    placeholderTextColor={colors.textMuted}
                                    value={institute}
                                    onChangeText={setInstitute}
                                />
                            </View>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Course</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    placeholder="e.g., Web Development Bootcamp"
                                    placeholderTextColor={colors.textMuted}
                                    value={course}
                                    onChangeText={setCourse}
                                />
                            </View>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Duration (minutes)</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    placeholder="30"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={duration}
                                    onChangeText={setDuration}
                                />
                            </View>
                            <View style={styles.settingsField}>
                                <Text style={styles.settingsLabel}>Publish Mode / Test Type</Text>
                                <View style={styles.pubModeContainer}>
                                    <TouchableOpacity
                                        style={[styles.pubModeBtn, publishMode === 'connected' && styles.pubModeBtnActive]}
                                        onPress={() => setPublishMode('connected')}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="link-outline" size={15} color={publishMode === 'connected' ? colors.white : colors.textSecondary} style={{ marginRight: 4 }} />
                                        <Text style={[styles.pubModeBtnText, publishMode === 'connected' && styles.pubModeBtnTextActive]}>LMS Connected</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pubModeBtn, publishMode === 'public' && styles.pubModeBtnActive]}
                                        onPress={() => setPublishMode('public')}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="globe-outline" size={15} color={publishMode === 'public' ? colors.white : colors.textSecondary} style={{ marginRight: 4 }} />
                                        <Text style={[styles.pubModeBtnText, publishMode === 'public' && styles.pubModeBtnTextActive]}>Public Web</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.settingsSaveBtn}
                            onPress={() => setSettingsOpen(false)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.settingsSaveBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Publish Options Modal */}
            <Modal
                visible={publishModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPublishModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.publishModalCard}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Publish Options</Text>
                            <TouchableOpacity onPress={() => setPublishModalVisible(false)} activeOpacity={0.8}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Mode Switcher */}
                        <View style={styles.pubModeContainer}>
                            <TouchableOpacity
                                style={[styles.pubModeBtn, publishMode === 'connected' && styles.pubModeBtnActive]}
                                onPress={() => setPublishMode('connected')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="link-outline" size={15} color={publishMode === 'connected' ? colors.white : colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.pubModeBtnText, publishMode === 'connected' && styles.pubModeBtnTextActive]}>Connect It</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pubModeBtn, publishMode === 'public' && styles.pubModeBtnActive]}
                                onPress={() => setPublishMode('public')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="globe-outline" size={15} color={publishMode === 'public' ? colors.white : colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.pubModeBtnText, publishMode === 'public' && styles.pubModeBtnTextActive]}>Public Web</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} style={{ flex: 1, marginTop: 12 }}>
                            {publishMode === 'connected' ? (
                                <View style={styles.settingsForm}>
                                    <Text style={styles.modalSectionTitle}>LMS CONNECTION CONFIG</Text>
                                    
                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Test Name / Title</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Enter test name..."
                                            placeholderTextColor={colors.textMuted}
                                            value={connectTestName}
                                            onChangeText={setConnectTestName}
                                        />
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Institute Name</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Select or enter Institute..."
                                            placeholderTextColor={colors.textMuted}
                                            value={connectInstitute}
                                            onChangeText={setConnectInstitute}
                                        />
                                        {institutesList.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                                                {institutesList.map((inst, idx) => (
                                                    <TouchableOpacity key={idx} style={styles.suggestPill} onPress={() => setConnectInstitute(inst.name)}>
                                                        <Text style={styles.suggestText}>{inst.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Course Name</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Select or enter Course..."
                                            placeholderTextColor={colors.textMuted}
                                            value={connectCourse}
                                            onChangeText={setConnectCourse}
                                        />
                                        {coursesList.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                                                {coursesList.map((c, idx) => (
                                                    <TouchableOpacity key={idx} style={styles.suggestPill} onPress={() => setConnectCourse(c.name)}>
                                                        <Text style={styles.suggestText}>{c.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Subject Name</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Select or enter Subject..."
                                            placeholderTextColor={colors.textMuted}
                                            value={connectSubject}
                                            onChangeText={setConnectSubject}
                                        />
                                        {(() => {
                                            const selectedCourseObj = coursesList.find(c => c.name === connectCourse);
                                            const subjects = selectedCourseObj ? selectedCourseObj.subjects : [];
                                            if (subjects.length > 0) {
                                                return (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                                                        {subjects.map((s, idx) => (
                                                            <TouchableOpacity key={idx} style={styles.suggestPill} onPress={() => setConnectSubject(s)}>
                                                                <Text style={styles.suggestText}>{s}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Test Index</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="e.g. Index 1"
                                            placeholderTextColor={colors.textMuted}
                                            value={connectIndex}
                                            onChangeText={setConnectIndex}
                                        />
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                                            {Array.from({ length: 10 }, (_, i) => `Index ${i + 1}`).map((idxStr) => (
                                                <TouchableOpacity key={idxStr} style={styles.suggestPill} onPress={() => setConnectIndex(idxStr)}>
                                                    <Text style={styles.suggestText}>{idxStr}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Type of Activity</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="e.g. Quiz"
                                            placeholderTextColor={colors.textMuted}
                                            value={connectActivity}
                                            onChangeText={setConnectActivity}
                                        />
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                                            {['Quiz', 'Test', 'Assignment', 'Exam', 'Viva'].map((actStr) => (
                                                <TouchableOpacity key={actStr} style={styles.suggestPill} onPress={() => setConnectActivity(actStr)}>
                                                    <Text style={styles.suggestText}>{actStr}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Date</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={colors.textMuted}
                                            value={connectDate}
                                            onChangeText={setConnectDate}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.settingsForm}>
                                    <Text style={styles.modalSectionTitle}>PUBLIC LINK CONFIG</Text>
                                    
                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Test Name / Title</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Enter test name..."
                                            placeholderTextColor={colors.textMuted}
                                            value={connectTestName}
                                            onChangeText={setConnectTestName}
                                        />
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Access Password (Optional)</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="Leave empty for public access"
                                            placeholderTextColor={colors.textMuted}
                                            value={publicPassword}
                                            onChangeText={setPublicPassword}
                                        />
                                    </View>

                                    <View style={styles.settingsField}>
                                        <Text style={styles.settingsLabel}>Time Limit (Minutes)</Text>
                                        <TextInput
                                            style={styles.settingsInput}
                                            placeholder="60"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="numeric"
                                            value={publicTimeLimit}
                                            onChangeText={setPublicTimeLimit}
                                        />
                                    </View>

                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchTextLabel}>Randomize Questions</Text>
                                        <Switch
                                            value={publicRandomize}
                                            onValueChange={setPublicRandomize}
                                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                                        />
                                    </View>

                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchTextLabel}>Allow Retake</Text>
                                        <Switch
                                            value={publicRetake}
                                            onValueChange={setPublicRetake}
                                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                                        />
                                    </View>

                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchTextLabel}>Show Score After Submission</Text>
                                        <Switch
                                            value={publicShowScore}
                                            onValueChange={setPublicShowScore}
                                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                                        />
                                    </View>

                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchTextLabel}>Show Correct Answers</Text>
                                        <Switch
                                            value={publicShowAnswers}
                                            onValueChange={setPublicShowAnswers}
                                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                                        />
                                    </View>

                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchTextLabel}>One Response Per Email</Text>
                                        <Switch
                                            value={publicOneResponse}
                                            onValueChange={setPublicOneResponse}
                                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                                        />
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.publishConfirmBtn}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.publishConfirmBtnText}>
                                        {publishMode === 'connected' ? 'Save & Assign to LMS' : 'Save & Publish to Web'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 50,
        paddingBottom: 12,
        paddingHorizontal: spacing.sm,
        gap: 8,
        elevation: 4,
    },
    topBarBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarCenter: { flex: 1 },
    titleInput: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    saveTopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#6366f1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
    },
    saveTopBtnText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '700' },

    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        flexWrap: 'wrap',
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statPillText: { fontSize: fontSizes.xs, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

    questionsArea: { flex: 1 },
    questionsContent: { padding: spacing.md },
    emptyCanvas: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        gap: spacing.sm,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.bgCard,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        marginBottom: spacing.sm,
    },
    emptyTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
    emptySubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

    qCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        elevation: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    qCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.bgSecondary,
    },
    qNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qNumber: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.white },
    qHeaderTitle: { flex: 1, fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
    qHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    qTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    qTypeText: { fontSize: fontSizes.xs, fontWeight: '800' },
    qCardBody: { padding: spacing.md, gap: spacing.sm },

    qTextInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.md,
        fontSize: fontSizes.md,
        color: colors.text,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: spacing.sm,
    },

    blockLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 6,
        marginBottom: 6,
    },

    // Option rows
    optionsSection: { gap: 8, marginTop: 4 },
    optionsLabel: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    correctCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctCircleActive: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    optionLetter: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.textSecondary },
    optionLetterActive: { color: colors.white },
    optionInput: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.sm,
        fontSize: fontSizes.md,
        color: colors.text,
        height: 44,
        marginBottom: 4,
    },
    optionInputCorrect: {
        borderColor: colors.success,
        backgroundColor: '#ecfdf5',
    },

    tfSection: { marginTop: 6 },
    tfButtons: { flexDirection: 'row', gap: spacing.md },
    tfBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 46,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    tfBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
    tfBtnActiveDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
    tfBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    tfBtnTextActive: { color: colors.white },

    urlInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        fontSize: fontSizes.md,
        color: colors.text,
        height: 46,
        marginBottom: spacing.sm,
    },

    addonsSection: { marginTop: 8 },
    addonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    addonPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    addonPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    addonPillText: { fontSize: fontSizes.xs - 1, fontWeight: '700', color: colors.textSecondary },
    addonPillTextActive: { color: colors.white },

    advancedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        marginTop: 8,
    },
    advancedTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary },
    advancedBody: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },

    marksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginTop: 8,
    },
    marksLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textSecondary },
    marksInput: {
        width: 60,
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.accent,
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: colors.accent,
        paddingVertical: 2,
    },

    qActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    qActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: borderRadius.md,
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    qDeleteBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    qActionText: { fontSize: fontSizes.xs, fontWeight: '700' },

    // Elements footer panel styles
    footerPanel: {
        backgroundColor: colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Platform.OS === 'ios' ? 24 : 10,
        paddingTop: 8,
        paddingHorizontal: spacing.sm,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    footerTabs: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xs,
        marginBottom: 8,
        gap: 6,
    },
    footerTab: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    footerTabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    footerTabText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    footerTabTextActive: {
        color: colors.white,
    },
    clearBtnFooter: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.md,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerItemsScroll: {
        gap: 8,
        paddingHorizontal: spacing.xs,
        paddingBottom: 2,
    },
    footerItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 8,
        minWidth: 120,
    },
    footerItemIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerItemLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.text,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
    settingsForm: { gap: spacing.md },
    settingsField: {},
    settingsLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    settingsInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        height: 48,
        fontSize: fontSizes.md,
        color: colors.text,
    },
    settingsSaveBtn: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    settingsSaveBtnText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
    // Short Answer Custom Styling
    saHeaderToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    saHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
    },
    saHeaderBtnText: {
        color: colors.white,
        fontSize: fontSizes.xs - 1,
        fontWeight: '700',
    },
    saHeaderBtnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#94a3b8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
    },
    saHeaderBtnOutlineText: {
        color: colors.textSecondary,
        fontSize: fontSizes.xs - 1,
        fontWeight: '700',
    },
    saInputWrapper: {
        position: 'relative',
        marginBottom: 4,
    },
    saTextInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.md,
        paddingRight: 45,
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.text,
        minHeight: 56,
        textAlignVertical: 'center',
    },
    saMicBtn: {
        position: 'absolute',
        right: 12,
        top: 15,
    },
    saAnswerBoxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: 10,
        gap: 12,
    },
    saAnswerBox: {
        flex: 1,
    },
    saAnswerBoxPlaceholder: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '500',
    },
    saEnableItRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderLeftWidth: 1.5,
        borderLeftColor: colors.borderLight,
        paddingLeft: 12,
    },
    saEnableItText: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    saSettingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        marginTop: 6,
    },
    saSettingsTitle: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.8,
    },
    saSettingsBody: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    saTextStyleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    saTextStyleText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    saButtonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    saGridBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    saGridBtnText: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '700',
    },
    saGridIconBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    pubModeContainer: {
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        padding: 4,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    pubModeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: borderRadius.sm,
    },
    pubModeBtnActive: {
        backgroundColor: colors.accent,
    },
    pubModeBtnText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    pubModeBtnTextActive: {
        color: colors.white,
    },
    publishModalCard: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        height: '85%',
    },
    modalSectionTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
        marginTop: 10,
        marginBottom: 8,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    switchTextLabel: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    publishConfirmBtn: {
        backgroundColor: '#10b981',
        borderRadius: borderRadius.lg,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: spacing.lg,
        elevation: 2,
    },
    publishConfirmBtnText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '750',
    },
    suggestScroll: {
        marginTop: 6,
        marginBottom: 10,
    },
    suggestPill: {
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginRight: 6,
    },
    suggestText: {
        fontSize: fontSizes.xs,
        color: '#4f46e5',
        fontWeight: '700',
    },
});

export default TestBuilder;
