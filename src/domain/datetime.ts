const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

export function parseLocalDateTime(value: string): Date {
  const [datePart, timePart = '00:00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function formatDateIt(value: Date | string): string {
  const date = typeof value === 'string' ? parseLocalDateTime(value) : value;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTimeHHmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isValidHHmm(value: string): boolean {
  return TIME_RE.test(value);
}

export function currentMonthPrefix(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function combineDateAndTime(date: Date, timeHHmm: string | ''): string {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (!timeHHmm) {
    const now = new Date();
    result.setHours(now.getHours(), now.getMinutes(), 0, 0);
  } else {
    const [hours, minutes] = timeHHmm.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
  }
  return toLocalDateTimeString(result);
}

export function startOfNextMonthPrefix(now = new Date()): string {
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return `${year}-${pad2(month)}`;
}
