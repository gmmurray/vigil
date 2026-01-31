import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDuration = (start: string, end: string | null) => {
  if (!end) return 'ONGOING';
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatSecondsAgo = (secondsAgo: number): string => {
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  return `${Math.floor(secondsAgo / 60)}m ago`;
};

export const formatInterval = (intervalSeconds: number): string => {
  if (intervalSeconds < 60) return `every ${intervalSeconds}s`;
  return `every ${Math.floor(intervalSeconds / 60)}m`;
};
