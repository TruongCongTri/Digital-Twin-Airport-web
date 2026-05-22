// Defines ALL entities/resources in the system
export const RESOURCES = {
  USER: "User",
  PRODUCT: "Product",
  CATEGORY: "Category",
  LESSON: "Lesson",
  PAYMENT: "Payment",
  ROLE: "Role",
  PERMISSION: "Permission",
  SESSION: "Login Session",
  OTP: "OTP Code",
  EMAIL: "Email",
  SMS: "SMS",
  ZALO: "Zalo",
} as const;

export type ResourceName = (typeof RESOURCES)[keyof typeof RESOURCES];
