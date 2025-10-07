import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3001/api",
});

const bookingApi = axios.create({
    baseURL: "http://localhost:3002/api",
});

const addToken = (config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

api.interceptors.request.use(addToken);
bookingApi.interceptors.request.use(addToken);

export { api, bookingApi };
