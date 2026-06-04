/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple XOR and Base64 encryption cipher to protect CNIC and IMEI data on disk and Firestore.
// In production, this can be linked with KMS/Vault, but locally it provides obfuscation against local DB scraping.
const ENCRYPTION_KEY = "MOBILE_MARKET_COMPLIANCE_SECURE_KEY";

export function encryptData(text: string): string {
  if (!text) return "";
  try {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    // Encode to base64 safely
    return btoa(encodeURIComponent(result));
  } catch (error) {
    return text;
  }
}

export function decryptData(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const decoded = decodeURIComponent(atob(cipherText));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    // Return original if it is not an encrypted b64 string
    return cipherText;
  }
}

// Validate and format Pakistani CNIC: XXXXX-XXXXXXX-X
export function validateAndCleanCNIC(cnic: string): { isValid: boolean; cleaned: string; formatted: string } {
  const cleaned = cnic.replace(/[^0-9]/g, "");
  const isValid = cleaned.length === 13;
  let formatted = cleaned;
  if (cleaned.length >= 5) {
    formatted = cleaned.slice(0, 5) + "-" + cleaned.slice(5);
  }
  if (cleaned.length >= 12) {
    formatted = cleaned.slice(0, 5) + "-" + cleaned.slice(5, 12) + "-" + cleaned.slice(12, 13);
  }
  return { isValid, cleaned, formatted };
}

// Mask CNIC for non-authorized viewers: e.g. 42101-*******-3
export function maskCNIC(cnic: string): string {
  if (!cnic) return "";
  const clean = cnic.replace(/[^0-9]/g, "");
  if (clean.length === 13) {
    return `${clean.slice(0, 5)}-*******-${clean.slice(12)}`;
  }
  return cnic.length > 6 ? `${cnic.slice(0, 4)}***${cnic.slice(-2)}` : "***";
}

// Mask IMEI: e.g. 863442******123
export function maskIMEI(imei: string): string {
  if (!imei) return "";
  if (imei.length >= 15) {
    return `${imei.slice(0, 6)}******${imei.slice(12)}`;
  }
  return imei.length > 4 ? `******${imei.slice(-4)}` : "******";
}

// Convert input of CNIC into formatted Pakistani CNIC: XXXXX-XXXXXXX-X as user types
export function formatCNICInput(val: string): string {
  const cleaned = val.replace(/[^0-9]/g, "").slice(0, 13);
  let formatted = cleaned;
  if (cleaned.length > 5) {
    formatted = cleaned.slice(0, 5) + "-" + cleaned.slice(5);
  }
  if (cleaned.length > 12) {
    formatted = cleaned.slice(0, 5) + "-" + cleaned.slice(5, 12) + "-" + cleaned.slice(12, 13);
  }
  return formatted;
}
