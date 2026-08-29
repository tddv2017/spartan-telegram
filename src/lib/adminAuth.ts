/**
 * Admin Authorization Library for Spartan Quant AI
 * Configured Admin Telegram Handle: @tddv2017
 */

export const ADMIN_HANDLES = ['tddv2017', 'spartan_9824029'];
export const ADMIN_TELEGRAM_IDS = [9824029, 1788035393];

export function checkIsAdmin(usernameOrId?: string | number): boolean {
  if (!usernameOrId) return false;
  
  if (typeof usernameOrId === 'string') {
    const cleanHandle = usernameOrId.replace('@', '').toLowerCase();
    return ADMIN_HANDLES.includes(cleanHandle);
  }

  if (typeof usernameOrId === 'number') {
    return ADMIN_TELEGRAM_IDS.includes(usernameOrId);
  }

  return false;
}
