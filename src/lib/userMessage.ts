// Error text shown to people must be Chinese. Messages written by this app are; errors from the network
// or a library (for example "Failed to fetch") are not, so those are replaced with the given fallback.
// File-format abbreviations and size units (PDF, PNG, MB, ...) are allowed inside a Chinese message.
const CHINESE = /[㐀-鿿]/;
const TECHNICAL_NAMES = /(?<![A-Za-z])(?:PDF|JPE?G|PNG|WebP|GIF|MB|KB|GB)(?![A-Za-z])/g;

export function userFacingMessage(error: unknown, fallback: string) {
  if (error instanceof Error && CHINESE.test(error.message) && !/[A-Za-z]{2,}/.test(error.message.replace(TECHNICAL_NAMES, ""))) {
    return error.message;
  }
  return fallback;
}
