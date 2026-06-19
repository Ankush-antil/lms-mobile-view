import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();

// Axios base URL
axios.defaults.baseURL = API_URL;

// Token interceptor
axios.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.get('/auth/me');
            setUser(data);
        } catch (error) {
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('authToken');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (email, password) => {
        const { data } = await axios.post('/auth/login', { email, password });
        if (data.token) {
            await AsyncStorage.setItem('authToken', data.token);
        }
        setUser(data);
        return data;
    };

    const logout = async () => {
        try {
            await axios.post('/auth/logout');
        } catch (e) {}
        await AsyncStorage.removeItem('authToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
