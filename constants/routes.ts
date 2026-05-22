export const APP_ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
  },
  DASHBOARD: {
    ROOT: "/dashboard",
    COURSES: "/dashboard/courses",
    SETTINGS: "/dashboard/settings",
  },
} as const;
