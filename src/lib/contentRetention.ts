export const CONTENT_RETENTION_MONTHS = 4;

export function getContentCutoffDate() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - CONTENT_RETENTION_MONTHS);
  return cutoffDate;
}

export function isContentExpired(content: { date: string }) {
  return new Date(content.date).getTime() < getContentCutoffDate().getTime();
}