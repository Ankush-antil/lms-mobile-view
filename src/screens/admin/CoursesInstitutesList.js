import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const CoursesList = ({ navigation }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/setup/courses');
            setCourses(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Courses" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateCourse')}
            />
            <Text style={styles.countText}>{courses.length} Courses</Text>
            <FlatList
                data={courses}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                ListEmptyComponent={<EmptyState icon="book-outline" title="No courses found" />}
                renderItem={({ item }) => (
                    <View style={styles.courseCard}>
                        <View style={styles.courseIcon}>
                            <Ionicons name="book" size={22} color={colors.warning} />
                        </View>
                        <View style={styles.courseInfo}>
                            <Text style={styles.courseName}>{item.name}</Text>
                            {item.description && <Text style={styles.courseDesc} numberOfLines={2}>{item.description}</Text>}
                            {item.institute?.name && (
                                <Badge label={item.institute.name} color={colors.accent} bg="#eef2ff" />
                            )}
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const InstitutesList = ({ navigation }) => {
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/setup/institutes');
            setInstitutes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Institutes" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateInstitute')}
            />
            <Text style={styles.countText}>{institutes.length} Institutes</Text>
            <FlatList
                data={institutes}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                ListEmptyComponent={<EmptyState icon="business-outline" title="No institutes found" />}
                renderItem={({ item }) => (
                    <View style={styles.courseCard}>
                        <View style={[styles.courseIcon, { backgroundColor: '#eef2ff' }]}>
                            <Ionicons name="business" size={22} color={colors.accent} />
                        </View>
                        <View style={styles.courseInfo}>
                            <Text style={styles.courseName}>{item.name}</Text>
                            {item.address && <Text style={styles.courseDesc}>{item.address}</Text>}
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    countText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 32 },
    courseCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    courseIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    courseInfo: { flex: 1, gap: 4 },
    courseName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    courseDesc: { fontSize: fontSizes.sm, color: colors.textMuted },
});

export { CoursesList, InstitutesList };
export default CoursesList;
