/**
 * Admin Authorization Library for Spartan Quant AI
 * Primary Admin Telegram Account: @tddv2017 (ID: 494232782)
 */

export const ADMIN_HANDLES = ['tddv2017', 'spartan_9824029'];
export const ADMIN_TELEGRAM_IDS = [494232782, 9824029, 1788035393];

export function checkIsAdmin(usernameOrId?: string | number): boolean {
  if (!usernameOrId) return false;
  
  if (typeof usernameOrId === 'number') {
    return ADMIN_TELEGRAM_IDS.includes(usernameOrId);
  }

  const str = String(usernameOrId).trim();
  if (!str) return false;

  const cleanHandle = str.replace('@', '').toLowerCase();
  if (ADMIN_HANDLES.includes(cleanHandle)) return true;

  const num = parseInt(str, 10);
  if (!isNaN(num) && ADMIN_TELEGRAM_IDS.includes(num)) return true;

  return false;
}
