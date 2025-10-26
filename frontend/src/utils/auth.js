import axios from "axios";

// Auth Service
const api = axios.create({
    baseURL: "http://localhost:3001/api", // Для Auth Service
});

// Booking Service
const bookingApi = axios.create({
    baseURL: "http://localhost:3002/api", // Для Booking Service
});

// Profile Service
const profileApi = axios.create({
    baseURL: "http://localhost:3003/api", // Для Profile Service
});

// Функция для добавления токена
const addToken = (config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

// Применяем интерцептор ко всем API
api.interceptors.request.use(addToken);
bookingApi.interceptors.request.use(addToken);
profileApi.interceptors.request.use(addToken);

export { api, bookingApi, profileApi }; // Экспортируем profileApi
