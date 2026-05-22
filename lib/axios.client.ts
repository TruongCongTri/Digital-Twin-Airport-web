import axios from "axios";
import { API_ENDPOINTS } from "@/constants/endpoints";
import { APP_ROUTES } from "@/constants/routes";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  // BẮT BUỘC CÓ DÒNG NÀY ĐỂ TRÌNH DUYỆT GỬI KÈM COOKIE REFRESH TOKEN LÊN BE
  withCredentials: true,
});

// Interceptor nạp AccessToken vào Request (nếu bạn lưu AccessToken ở Zustand/LocalStorage)
axiosClient.interceptors.request.use((config) => {
  // Lấy token từ Zustand Store (Ví dụ)
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor xử lý lỗi 401 & Tự động xoay vòng Token
axiosClient.interceptors.response.use(
  (response) => response.data, // Chỉ lấy data, bỏ qua vỏ Axios
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 (Hết AccessToken) và chưa từng thử refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Gọi API Refresh Token. Cookie HttpOnly sẽ tự động bay lên BE!
        const res = await axiosClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN);

        const newAccessToken = res.data?.accessToken;
        // Lưu lại AccessToken mới (vào Zustand hoặc LocalStorage)
        localStorage.setItem("accessToken", newAccessToken);

        // Đính token mới vào request cũ và gọi lại API bị tịt ban nãy
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Nếu Refresh Token cũng chết (hoặc user không chọn Remember Me và đã tắt trình duyệt)
        localStorage.removeItem("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = APP_ROUTES.AUTH.LOGIN; // Đá văng ra trang Login
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
