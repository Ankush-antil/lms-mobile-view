import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    FlatList,
    Linking,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';

// WEB_CLIENT_ID configuration (required for Android Google Sign-In backend verification)
// IMPORTANT: Replace this with your Google Cloud Console "Web application" Client ID if you get DEVELOPER_ERROR (code 10).
const WEB_CLIENT_ID = '1091703484552-3on2k6u7dlupdhdsejj71dqlkmard2cq.apps.googleusercontent.com';

// Configure Google Sign-In SDK
GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
});

const TARGET_FOLDERS = [
    "Screenshot Tool",
    "Screen Recorder",
    "Voice Recorder",
    "Video Recorder",
    "Web-Calling Tool"
];

const FOLDER_ICONS = {
    "Screenshot Tool": "camera-outline",
    "Screen Recorder": "videocam-outline",
    "Voice Recorder": "mic-outline",
    "Video Recorder": "film-outline",
    "Web-Calling Tool": "call-outline"
};

const GoogleDriveModal = ({ isOpen, onClose, fileName, fileUri, toolType, onSaveSuccess }) => {
    const [step, setStep] = useState(1); // 1: Connect Account, 2: Workspace/History
    const [accessToken, setAccessToken] = useState('');
    const [googleUser, setGoogleUser] = useState(null);

    // Folders & Upload state
    const [foldersMap, setFoldersMap] = useState({});
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
    const [driveFileId, setDriveFileId] = useState('');

    // Tabs & History state
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history'
    const [historyLevel, setHistoryLevel] = useState(0); // 0: Dates, 1: Tools, 2: Files
    const [selectedDateFolder, setSelectedDateFolder] = useState(null);
    const [selectedToolFolder, setSelectedToolFolder] = useState(null);
    const [dateFolders, setDateFolders] = useState([]);
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (isOpen) {
            checkExistingAuth();
        }
    }, [isOpen]);

    const checkExistingAuth = async () => {
        try {
            const savedToken = await AsyncStorage.getItem('lms_google_access_token');
            const savedUserStr = await AsyncStorage.getItem('lms_google_user');
            if (savedToken && savedUserStr) {
                const user = JSON.parse(savedUserStr);
                setAccessToken(savedToken);
                setGoogleUser(user);
                setStep(2);
                
                setActiveTab(fileUri ? 'upload' : 'history');
                if (fileUri) {
                    autoSaveFlow(savedToken, user.email);
                } else {
                    loadHistoryRoot(savedToken);
                }
            } else {
                setStep(1);
            }
        } catch (err) {
            setStep(1);
        }
    };

    const handleConnect = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const tokens = await GoogleSignin.getTokens();
            const token = tokens.accessToken;

            setAccessToken(token);
            setGoogleUser(userInfo.user);

            await AsyncStorage.setItem('lms_google_access_token', token);
            await AsyncStorage.setItem('lms_google_user', JSON.stringify(userInfo.user));

            setStep(2);
            setActiveTab(fileUri ? 'upload' : 'history');
            if (fileUri) {
                autoSaveFlow(token, userInfo.user.email);
            } else {
                loadHistoryRoot(token);
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert("Cancelled", "Login was cancelled.");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Alert.alert("In Progress", "Login is already in progress.");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert("Play Services", "Google Play Services are not available on this device.");
            } else {
                Alert.alert("Authentication Failed", "Please make sure your SHA-1 is registered and your Google Client ID is correct.");
            }
        }
    };

    const handleSignOut = async () => {
        try {
            await GoogleSignin.signOut();
        } catch (e) {}
        await AsyncStorage.removeItem('lms_google_access_token');
        await AsyncStorage.removeItem('lms_google_user');
        setAccessToken('');
        setGoogleUser(null);
        setStep(1);
    };

    const getOrCreateLmsStructure = async (token, targetFolderName = null) => {
        // 1. Check or create LMS folder in root
        let lmsFolderId = '';
        const lmsQuery = encodeURIComponent("name = 'LMS' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false");
        const lmsRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${lmsQuery}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!lmsRes.ok) throw new Error(`LMS folder query error: ${lmsRes.status}`);
        const lmsData = await lmsRes.json();
        if (lmsData.files && lmsData.files.length > 0) {
            lmsFolderId = lmsData.files[0].id;
        } else {
            const createLms = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'LMS',
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['root']
                })
            });
            if (!createLms.ok) throw new Error(`LMS folder creation error: ${createLms.status}`);
            const newLms = await createLms.json();
            lmsFolderId = newLms.id;
        }

        // 2. Check or create date folder (DD-MM-YYYY) inside LMS folder
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const todayStr = `${dd}-${mm}-${yyyy}`;

        let dateFolderId = '';
        const dateQuery = encodeURIComponent(`name = '${todayStr}' and mimeType = 'application/vnd.google-apps.folder' and '${lmsFolderId}' in parents and trashed = false`);
        const dateRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${dateQuery}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!dateRes.ok) throw new Error(`Date folder query error: ${dateRes.status}`);
        const dateData = await dateRes.json();
        if (dateData.files && dateData.files.length > 0) {
            dateFolderId = dateData.files[0].id;
        } else {
            const createDate = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: todayStr,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [lmsFolderId]
                })
            });
            if (!createDate.ok) throw new Error(`Date folder creation error: ${createDate.status}`);
            const newDate = await createDate.json();
            dateFolderId = newDate.id;
        }

        // 3. Check or create target tool folder inside dateFolder
        const toolQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and '${dateFolderId}' in parents and trashed = false`);
        const toolRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${toolQuery}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!toolRes.ok) throw new Error(`Tool folders query error: ${toolRes.status}`);
        const toolData = await toolRes.json();
        const existingTools = toolData.files || [];
        const tempMap = {};
        existingTools.forEach(f => {
            if (TARGET_FOLDERS.includes(f.name)) {
                tempMap[f.name] = f.id;
            }
        });

        if (targetFolderName && TARGET_FOLDERS.includes(targetFolderName)) {
            if (!tempMap[targetFolderName]) {
                const createTool = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: targetFolderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [dateFolderId]
                    })
                });
                if (!createTool.ok) throw new Error(`Tool folder creation error: ${createTool.status}`);
                const newTool = await createTool.json();
                tempMap[targetFolderName] = newTool.id;
            }
        }

        return { lmsFolderId, dateFolderId, foldersMap: tempMap };
    };

    const detectFolderName = () => {
        switch (toolType) {
            case 'screenshot': return "Screenshot Tool";
            case 'screen-recorder': return "Screen Recorder";
            case 'voice-recorder': return "Voice Recorder";
            case 'video-recorder': return "Video Recorder";
            case 'web-calling': return "Web-Calling Tool";
            default: return "Screenshot Tool";
        }
    };

    const autoSaveFlow = async (token, email) => {
        setUploadState('uploading');
        setUploadProgress(10);
        try {
            const folderName = detectFolderName();
            const { foldersMap: tempMap } = await getOrCreateLmsStructure(token, folderName);
            setFoldersMap(tempMap);
            setUploadProgress(30);

            const targetFolderId = tempMap[folderName];
            if (!targetFolderId) {
                throw new Error(`Failed to map folder: ${folderName}`);
            }

            // Count existing files to determine next sequential index
            const filesQuery = encodeURIComponent(`'${targetFolderId}' in parents and trashed = false`);
            const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id, name)`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!filesRes.ok) throw new Error(`Files listing error: ${filesRes.status}`);
            const filesData = await filesRes.json();
            const existingFiles = filesData.files || [];

            const nextIndex = existingFiles.length + 1;
            const extension = fileName.split('.').pop() || 'png';
            const finalName = `f${nextIndex}_${folderName}.${extension}`;

            setUploadProgress(50);

            // Fetch file URI to Blob
            const fileBlobResponse = await fetch(fileUri);
            const blob = await fileBlobResponse.blob();

            setUploadProgress(70);

            // Perform Multipart Upload to Google Drive
            await performUpload(token, targetFolderId, finalName, blob, email);
        } catch (err) {
            console.error("Auto save to Drive error:", err);
            setUploadState('error');
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                Alert.alert("Session Expired", "Google authentication has expired. Please connect again.");
                handleSignOut();
            } else {
                Alert.alert("Upload Error", err.message || "Could not save file to Google Drive.");
            }
        }
    };

    const performUpload = (token, folderId, finalName, blob, email) => {
        return new Promise((resolve, reject) => {
            const metadata = {
                name: finalName,
                mimeType: blob.type || 'image/png',
                parents: [folderId]
            };

            const boundary = 'lms_google_drive_upload_boundary';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = async () => {
                try {
                    // Extract base64 content
                    const base64Data = reader.result.split(',')[1];
                    
                    // Construct boundary payload
                    const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
                    const mediaPartHeader = `Content-Type: ${blob.type || 'image/png'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

                    const body = delimiter + 
                                 metadataPart + 
                                 delimiter + 
                                 mediaPartHeader + 
                                 base64Data + 
                                 closeDelimiter;

                    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body: body
                    });

                    if (res.ok) {
                        const driveData = await res.json();
                        setDriveFileId(driveData.id);

                        // Sync with backend API
                        try {
                            const formData = new FormData();
                            formData.append('file', {
                                uri: fileUri,
                                name: finalName,
                                type: blob.type || 'image/png'
                            });
                            formData.append('toolType', toolType);
                            formData.append('googleDriveEmail', email);

                            await axios.post('/practice-files/upload', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                        } catch (backendErr) {
                            console.warn("Backend metadata sync failed:", backendErr);
                        }

                        setUploadProgress(100);
                        setUploadState('success');
                        if (onSaveSuccess) onSaveSuccess();
                        resolve(driveData);
                    } else {
                        const errText = await res.text();
                        console.error("Upload API Failed:", res.status, errText);
                        reject(new Error(`Google Drive API responded with status ${res.status}`));
                    }
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => {
                reject(new Error("Failed to read file binary."));
            };
        });
    };

    // Load History root: Dates list inside LMS folder
    const loadHistoryRoot = async (token) => {
        try {
            setLoadingHistory(true);
            setHistoryLevel(0);
            setDateFolders([]);

            // Find LMS folder first
            let lmsFolderId = '';
            const lmsQuery = encodeURIComponent("name = 'LMS' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false");
            const lmsRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${lmsQuery}&fields=files(id)`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!lmsRes.ok) throw new Error("Could not find LMS folder");
            const lmsData = await lmsRes.json();
            if (!lmsData.files || lmsData.files.length === 0) {
                setLoadingHistory(false);
                return; // LMS folder doesn't exist yet
            }
            lmsFolderId = lmsData.files[0].id;

            // List Date folders inside LMS
            const datesQuery = encodeURIComponent(`'${lmsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
            const datesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${datesQuery}&fields=files(id, name)&orderBy=name+desc`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!datesRes.ok) throw new Error("Could not load date folders");
            const datesData = await datesRes.json();
            setDateFolders(datesData.files || []);
        } catch (err) {
            console.error("Load history error:", err);
            Alert.alert("History Error", "Failed to retrieve history folders.");
        } finally {
            setLoadingHistory(false);
        }
    };

    // Load Tools inside a Date folder
    const selectDateFolder = async (folder) => {
        setSelectedDateFolder(folder);
        setHistoryLevel(1);
    };

    // Load Files inside a Tool folder for the selected Date
    const selectToolFolder = async (toolName) => {
        try {
            setLoadingHistory(true);
            setSelectedToolFolder(toolName);
            setDriveFiles([]);

            // Search for folder matching toolName inside selectedDateFolder
            const toolQuery = encodeURIComponent(`name = '${toolName}' and mimeType = 'application/vnd.google-apps.folder' and '${selectedDateFolder.id}' in parents and trashed = false`);
            const toolRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${toolQuery}&fields=files(id)`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!toolRes.ok) throw new Error("Failed to load tool folder");
            const toolData = await toolRes.json();
            
            if (!toolData.files || toolData.files.length === 0) {
                setHistoryLevel(2);
                return; // Folder doesn't exist
            }
            const folderId = toolData.files[0].id;

            // Get files inside the tool folder
            const filesQuery = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
            const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id, name, mimeType, webViewLink, size)&orderBy=name+desc`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!filesRes.ok) throw new Error("Failed to load files");
            const filesData = await filesRes.json();
            setDriveFiles(filesData.files || []);
            setHistoryLevel(2);
        } catch (err) {
            console.error("Load files error:", err);
            Alert.alert("History Error", "Could not load files inside folder.");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleOpenFile = (url) => {
        if (url) {
            Linking.openURL(url).catch(() => Alert.alert("Error", "Cannot open file link."));
        }
    };

    const handleDeleteFile = (id) => {
        Alert.alert("Delete File", "Are you sure you want to delete this file from Google Drive?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (res.ok) {
                            setDriveFiles(prev => prev.filter(f => f.id !== id));
                            Alert.alert("Deleted", "File deleted from Google Drive!");
                        } else {
                            throw new Error("Failed to delete");
                        }
                    } catch (err) {
                        Alert.alert("Error", "Could not delete file.");
                    }
                }
            }
        ]);
    };

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <Ionicons name="logo-google" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                            <Text style={styles.headerTitle}>Google Drive Backup</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 1 ? (
                        /* Step 1: Connect Account */
                        <View style={styles.connectContainer}>
                            <Ionicons name="cloud-upload" size={64} color={colors.accentLight} style={{ marginBottom: 16 }} />
                            <Text style={styles.connectTitle}>Connect Google Account</Text>
                            <Text style={styles.connectDesc}>
                                Backup your practice recordings, screenshots, and calling transcripts directly to your Google Drive to save cloud storage space.
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleConnect}
                                style={styles.connectButton}
                            >
                                <Ionicons name="logo-google" size={18} color={colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.connectButtonText}>Sign In with Google</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Step 2: Main Workspace */
                        <View style={styles.mainContainer}>
                            {/* Profile details */}
                            <View style={styles.profileRow}>
                                <View>
                                    <Text style={styles.profileName}>{googleUser?.name || 'Google Account'}</Text>
                                    <Text style={styles.profileEmail}>{googleUser?.email || ''}</Text>
                                </View>
                                <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            </View>

                            {/* Tabs */}
                            <View style={styles.tabsRow}>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('upload')}
                                    style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
                                >
                                    <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>Upload File</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveTab('history');
                                        loadHistoryRoot(accessToken);
                                    }}
                                    style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                                >
                                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>View History</Text>
                                </TouchableOpacity>
                            </View>

                            {activeTab === 'upload' ? (
                                /* Upload Tab */
                                <View style={styles.uploadContainer}>
                                    {uploadState === 'uploading' && (
                                        <View style={styles.stateBox}>
                                            <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 16 }} />
                                            <Text style={styles.stateTitle}>Saving to Google Drive...</Text>
                                            <Text style={styles.stateProgress}>{uploadProgress}% Completed</Text>
                                        </View>
                                    )}

                                    {uploadState === 'success' && (
                                        <View style={styles.stateBox}>
                                            <Ionicons name="checkmark-circle" size={54} color={colors.success} style={{ marginBottom: 16 }} />
                                            <Text style={[styles.stateTitle, { color: colors.success }]}>Saved Successfully!</Text>
                                            <Text style={styles.stateFileName} numberOfLines={1}>{fileName}</Text>
                                            <Text style={styles.stateDesc}>File uploaded to Drive folder LMS/Date/{detectFolderName()}</Text>
                                            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                                                <Text style={styles.doneBtnText}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {uploadState === 'error' && (
                                        <View style={styles.stateBox}>
                                            <Ionicons name="alert-circle" size={54} color={colors.danger} style={{ marginBottom: 16 }} />
                                            <Text style={[styles.stateTitle, { color: colors.danger }]}>Upload Failed</Text>
                                            <Text style={styles.stateDesc}>An error occurred while uploading. Please check your credentials and network connection.</Text>
                                            <TouchableOpacity onPress={() => autoSaveFlow(accessToken, googleUser?.email)} style={styles.doneBtn}>
                                                <Text style={styles.doneBtnText}>Retry</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {uploadState === 'idle' && (
                                        <View style={styles.stateBox}>
                                            <Ionicons name="cloud-upload" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                                            <Text style={styles.stateTitle}>No Active Upload</Text>
                                            <Text style={styles.stateDesc}>Select a file from logs or record a new one to save.</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                /* History Tab */
                                <View style={styles.historyContainer}>
                                    {loadingHistory ? (
                                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
                                    ) : (
                                        <View style={{ flex: 1 }}>
                                            {/* Navigation breadcrumb */}
                                            <View style={styles.breadcrumbRow}>
                                                <TouchableOpacity
                                                    disabled={historyLevel === 0}
                                                    onPress={() => {
                                                        if (historyLevel === 2) {
                                                            setHistoryLevel(1);
                                                        } else if (historyLevel === 1) {
                                                            setHistoryLevel(0);
                                                        }
                                                    }}
                                                    style={[styles.backBtn, historyLevel === 0 && { opacity: 0.3 }]}
                                                >
                                                    <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.backBtnText}>Back</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.breadcrumbText} numberOfLines={1}>
                                                    {historyLevel === 0 ? "Root / LMS" : (historyLevel === 1 ? `LMS / ${selectedDateFolder?.name}` : `${selectedDateFolder?.name} / ${selectedToolFolder}`)}
                                                </Text>
                                            </View>

                                            {historyLevel === 0 && (
                                                /* Level 0: Dates List */
                                                <FlatList
                                                    data={dateFolders}
                                                    keyExtractor={item => item.id}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity onPress={() => selectDateFolder(item)} style={styles.historyItem}>
                                                            <Ionicons name="folder" size={24} color={colors.warning} style={{ marginRight: 12 }} />
                                                            <Text style={styles.historyItemName}>{item.name}</Text>
                                                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                                        </TouchableOpacity>
                                                    )}
                                                    ListEmptyComponent={
                                                        <View style={styles.emptyState}>
                                                            <Ionicons name="folder-open" size={40} color={colors.textMuted} />
                                                            <Text style={styles.emptyStateText}>No history folder found in LMS.</Text>
                                                        </View>
                                                    }
                                                />
                                            )}

                                            {historyLevel === 1 && (
                                                /* Level 1: Tools List */
                                                <FlatList
                                                    data={TARGET_FOLDERS}
                                                    keyExtractor={item => item}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity onPress={() => selectToolFolder(item)} style={styles.historyItem}>
                                                            <Ionicons name={FOLDER_ICONS[item]} size={22} color={colors.accent} style={{ marginRight: 12 }} />
                                                            <Text style={styles.historyItemName}>{item}</Text>
                                                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            )}

                                            {historyLevel === 2 && (
                                                /* Level 2: Files List */
                                                <FlatList
                                                    data={driveFiles}
                                                    keyExtractor={item => item.id}
                                                    renderItem={({ item }) => (
                                                        <View style={styles.fileRow}>
                                                            <TouchableOpacity onPress={() => handleOpenFile(item.webViewLink)} style={styles.fileClickArea}>
                                                                <Ionicons
                                                                    name={item.mimeType.startsWith('image') ? 'image' : (item.mimeType.startsWith('video') ? 'film' : (item.mimeType.startsWith('audio') ? 'mic' : 'document-text'))}
                                                                    size={24}
                                                                    color={colors.textSecondary}
                                                                    style={{ marginRight: 12 }}
                                                                />
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.historyItemName} numberOfLines={1}>{item.name}</Text>
                                                                    {item.size && (
                                                                        <Text style={styles.fileSizeText}>
                                                                            {(parseInt(item.size) / (1024 * 1024)).toFixed(2)} MB
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => handleDeleteFile(item.id)} style={styles.deleteBtn}>
                                                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                    ListEmptyComponent={
                                                        <View style={styles.emptyState}>
                                                            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
                                                            <Text style={styles.emptyStateText}>No files in this folder.</Text>
                                                        </View>
                                                    }
                                                />
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: colors.bg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        height: '80%',
        padding: spacing.md
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text
    },
    closeBtn: {
        padding: 4
    },
    connectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl
    },
    connectTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8
    },
    connectDesc: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.xl,
        paddingVertical: 14,
        borderRadius: borderRadius.md,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4
    },
    connectButtonText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '800'
    },
    mainContainer: {
        flex: 1
    },
    profileRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    profileName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text
    },
    profileEmail: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary
    },
    signOutBtn: {
        padding: 8
    },
    tabsRow: {
        flexDirection: 'row',
        marginVertical: 12,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.sm,
        padding: 4
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: borderRadius.sm
    },
    tabActive: {
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1
    },
    tabText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    tabTextActive: {
        color: colors.accent
    },
    uploadContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    stateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl
    },
    stateTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 6
    },
    stateProgress: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.accent
    },
    stateFileName: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12
    },
    stateDesc: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20
    },
    doneBtn: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.xl,
        paddingVertical: 10,
        borderRadius: borderRadius.sm
    },
    doneBtnText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '800'
    },
    historyContainer: {
        flex: 1
    },
    breadcrumbRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: spacing.xs
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
        paddingRight: 6
    },
    backBtnText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        marginLeft: 2
    },
    breadcrumbText: {
        flex: 1,
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.accent
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight
    },
    historyItemName: {
        flex: 1,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.text
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight
    },
    fileClickArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },
    fileSizeText: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2
    },
    deleteBtn: {
        padding: 8
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60
    },
    emptyStateText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: 10
    }
});

export default GoogleDriveModal;
