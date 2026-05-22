export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH_TOKEN: "/auth/refresh-token", // Trùng khớp 100% với BE của bạn
    ME: "/auth/me",
  },
  COURSES: {
    LIST: "/courses",
    DETAIL: (id: string) => `/courses/${id}`, // Cấu trúc hàm cho dynamic params
  },
} as const;
