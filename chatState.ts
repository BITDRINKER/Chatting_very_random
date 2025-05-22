import { format, formatDistance, formatRelative, subDays } from 'date-fns';

// Format timestamp for chat messages
export function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If less than a minute ago, show "Just now"
    if (now.getTime() - date.getTime() < 60000) {
      return "Just now";
    }
    
    // If less than 24 hours, show time
    if (now.getTime() - date.getTime() < 86400000) {
      return format(date, 'h:mm a');
    }
    
    // If more than 24 hours ago, show relative time
    return formatDistance(date, now, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return "Unknown time";
  }
}
