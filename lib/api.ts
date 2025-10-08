import axios from 'axios';

// Get API base URL from environment
function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  return base.replace(/\/$/, '');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // This ensures cookies are sent with requests
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (optional)
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    console.log('Request config:', { 
      withCredentials: config.withCredentials, 
      baseURL: config.baseURL,
      url: config.url 
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.log('Request error:', {
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Export the base URL getter for compatibility
export { getApiBaseUrl };
