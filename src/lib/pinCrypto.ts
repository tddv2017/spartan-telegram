/**
 * Master PIN verification client.
 *
 * The PIN is adjudicated by `/api/verify-admin-pin`. It is deliberately not
 * compared in the browser: a six-digit PIN behind a static salt can be
 * recovered offline in seconds, and any client-side check can simply be
 * skipped by an attacker who controls the page.
 */

import { ApiError, apiFetch } from './telegramClient';

export async function verifyMasterPin(
  pin: string
): Promise<{ success: boolean; message: string }> {
  const clean = pin.trim();
  if (!/^\d{4,8}$/.test(clean)) {
    return { success: false, message: 'Vui lòng nhập mã PIN hợp lệ.' };
  }

  try {
    const data = await apiFetch<{ message?: string }>('/api/verify-admin-pin', { pin: clean });
    return { success: true, message: data.message || '✓ Xác thực Master PIN thành công.' };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: '❌ Không thể xác thực mã PIN. Vui lòng thử lại.' };
  }
}
