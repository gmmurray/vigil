export function displayMonitorId(ulid: string) {
  return `MON-${ulid.slice(-6).toUpperCase()}`;
}
