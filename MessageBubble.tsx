import { ChatMessageType } from "@shared/schema";
import { formatTimeAgo } from "@/lib/chatState";

interface MessageBubbleProps {
  message: ChatMessageType;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  // Format the timestamp
  const formattedTime = formatTimeAgo(message.timestamp);
  
  if (isMine) {
    return (
      <div className="flex items-end justify-end mb-4">
        <div className="max-w-[80%] bg-primary text-white p-3 rounded-lg rounded-br-none">
          <p>{message.content}</p>
          <span className="text-xs text-white opacity-70 block text-right mt-1">
            {formattedTime}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-end mb-4">
      <div className="max-w-[80%] bg-neutral-200 text-neutral-900 p-3 rounded-lg rounded-bl-none">
        <p>{message.content}</p>
        <span className="text-xs text-neutral-400 block text-right mt-1">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
