import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    timeout: 30000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Normalize Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle explicit backend errors (HTTP 4xx, 5xx)
        if (error.response) {
            const status = error.response.status;

            // Auto-logout if token is expired/invalid
            if (status === 401 || status === 403) {
                if (window.location.pathname.includes('admin')) {
                    // Clear token if we hit unauthorized on admin routes
                    localStorage.removeItem('adminToken');
                    // Note: We don't force redirect here because React state manages the login UI
                }
            }

            const message = error.response.data?.detail || `Server Error (${status})`;
            return Promise.reject({ status, message, isNetworkError: false });
        }

        // Handle network errors (Server offline, CORS block, timeout)
        if (error.request) {
            return Promise.reject({
                status: 0,
                message: "Network Error: Could not connect to the server. Please check your connection.",
                isNetworkError: true
            });
        }

        // Handle completely unexpected errors
        return Promise.reject({
            status: -1,
            message: error.message || "An unexpected error occurred.",
            isNetworkError: false
        });
    }
);

export default api;
