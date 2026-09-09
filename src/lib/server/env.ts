/**
 * Server-only accessors for sensitive configuration.
 *
 * Every secret must come from the environment. There are deliberately no
 * literal fallbacks here: a missing secret has to fail the request loudly
 * instead of silently accepting a value that is public in the git history.
 */

export class ConfigError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`MISSING_CONFIG: Biến môi trường ${variable} chưa được thiết lập`);
    this.name = 'ConfigError';
    this.variable = variable;
  }
}

function required(variable: string): string {
  const value = process.env[variable];
  if (!value || !value.trim()) {
    throw new ConfigError(variable);
  }
  return value.trim();
}

function optional(variable: string): string | undefined {
  const value = process.env[variable];
  return value && value.trim() ? value.trim() : undefined;
}

/** Telegram bot token, used both for Bot API calls and initData verification. */
export const getBotToken = (): string => required('BOT_TOKEN');

/** Shared secret for deposit-order HMAC signatures. */
export const getHmacSecret = (): string => required('SPARTAN_HMAC_SECRET');

/** Shared secret the MetaTrader Expert Advisor uses to sign webhook calls. */
export const getEaSecretKey = (): string => required('EA_SECRET_KEY');

/** Base32 seed backing the admin TOTP authenticator. */
export const getTotpSecret = (): string => required('ADMIN_TOTP_SECRET');

/** Key used to hash custody OTPs and the admin PIN before comparison. */
export const getOtpHashKey = (): string => required('OTP_HASH_KEY');

/** Keyed hash of the level-1 admin master PIN. Generate with `npm run hash-pin`. */
export const getAdminPinHash = (): string => required('ADMIN_PIN_HASH');

/** Treasury wallet that legitimate USDT deposits must be sent to. */
export const getMasterWalletAddress = (): string => required('MASTER_WALLET_ADDRESS');

/**
 * Legacy Realtime Database secret (or a minted admin token). Optional while the
 * database rules are still permissive; required once rules are locked down.
 */
export const getDatabaseSecret = (): string | undefined => optional('FIREBASE_DB_SECRET');

export const getTronGridApiKey = (): string | undefined => optional('TRONGRID_API_KEY');
