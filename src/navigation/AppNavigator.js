import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TeacherActivities from '../screens/teacher/TeacherActivities';
import { CoursesList, InstitutesList } from '../screens/admin/CoursesInstitutesList';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Screens
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Student
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentTests from '../screens/student/StudentTests';
import TakeTestScreen from '../screens/student/TakeTestScreen';
import ViewTestResult from '../screens/student/ViewTestResult';

// Teacher
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import EvaluatePage from '../screens/teacher/EvaluatePage';
import ContactStudents from '../screens/teacher/ContactStudents';

// Admin
import AdminDashboard from '../screens/admin/AdminDashboard';
import { StudentsList, TeachersList, EditorsList } from '../screens/admin/UserListScreen';
import TestsList from '../screens/admin/TestsList';
import TestBuilder from '../screens/admin/TestBuilder';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import CreateUserScreen from '../screens/admin/CreateUserScreen';
import CreateCourseScreen from '../screens/admin/CreateCourseScreen';
import CreateInstituteScreen from '../screens/admin/CreateInstituteScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
    headerShown: false,
    animation: 'slide_from_right',
    contentStyle: { backgroundColor: colors.bg },
};

// ─── Student Stack ──────────────────────────────────────────────────────────────
const StudentStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        <Stack.Screen name="StudentTests" component={StudentTests} />
        <Stack.Screen name="TakeTest" component={TakeTestScreen} />
        <Stack.Screen name="ViewTestResult" component={ViewTestResult} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
);

// ─── Teacher Stack ──────────────────────────────────────────────────────────────
const TeacherStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
        <Stack.Screen name="TeacherActivities" component={TeacherActivities} />
        <Stack.Screen name="EvaluatePage" component={EvaluatePage} />
        <Stack.Screen name="ContactStudents" component={ContactStudents} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
);

// ─── Admin Stack ────────────────────────────────────────────────────────────────
const AdminStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="StudentsList" component={StudentsList} />
        <Stack.Screen name="TeachersList" component={TeachersList} />
        <Stack.Screen name="EditorsList" component={EditorsList} />
        <Stack.Screen name="CoursesList" component={CoursesList} />
        <Stack.Screen name="InstitutesList" component={InstitutesList} />
        <Stack.Screen name="TestsList" component={TestsList} />
        <Stack.Screen name="TestBuilder" component={TestBuilder} />
        <Stack.Screen name="UserDetail" component={UserDetailScreen} />
        <Stack.Screen name="CreateUser" component={CreateUserScreen} />
        <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
        <Stack.Screen name="CreateInstitute" component={CreateInstituteScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
);

// ─── Root Navigator ──────────────────────────────────────────────────────────────
const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.loadingScreen}>
                <View style={styles.loadingLogo}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : user.role === 'Student' ? (
                    // Student
                    <Stack.Screen name="StudentRoot" component={StudentStack} />
                ) : user.role === 'Teacher' ? (
                    // Teacher
                    <Stack.Screen name="TeacherRoot" component={TeacherStack} />
                ) : (user.role === 'Admin' || user.role === 'Editor') ? (
                    // Admin/Editor
                    <Stack.Screen name="AdminRoot" component={AdminStack} />
                ) : (
                    // Fallback
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingScreen: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default AppNavigator;
