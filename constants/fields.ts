// Defines ALL field names used for UI labels and validation messages
export const FIELDS = {
  // --- AUTH & USER ---
  EMAIL: "Email",
  PHONE: "Phone number",
  PASSWORD: "Password",
  CURRENT_PASSWORD: "Current password",
  NEW_PASSWORD: "New password",
  CONFIRM_PASSWORD: "Confirm password",
  FULL_NAME: "Full name",
  AVATAR: "Avatar",
  DEVICE_ID: "Device ID",
  SESSION_ID: "Session ID",
  IDENTIFIER: "Identifier (Email/Phone)",
  OTP_CODE: "Verification code (OTP)",
  CHANNEL: "Delivery channel",
  TOKEN: "Token",
  REFRESH_TOKEN: "Refresh Token",

  // --- COURSE (Phase 2) ---
  TITLE: "Title",
  DESCRIPTION: "Description",
  PRICE: "Price",
  THUMBNAIL: "Thumbnail",

  // --- GENERAL ---
  ID: "ID",
  STATUS: "Status",
} as const;

export type FieldName = (typeof FIELDS)[keyof typeof FIELDS];
