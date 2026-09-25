// Data validation utilities

export function isRequired(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  return true;
}

export function isPositiveNumber(val) {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}

export function isNonNegativeNumber(val) {
  const num = Number(val);
  return !isNaN(num) && num >= 0;
}

export function isValidEmail(email) {
  if (!email) return true; // Optional email
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone) {
  if (!phone) return true; // Optional
  const re = /^[\d\s-+#()]{7,15}$/;
  return re.test(phone);
}
