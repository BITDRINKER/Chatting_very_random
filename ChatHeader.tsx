import { MessageCircle, MoreVertical } from "lucide-react";
import { ChatState } from "@shared/schema";

interface ChatHeaderProps {
  status: ChatState;
  isConnected: boolean;
}

export default function ChatHeader({ status, isConnected }: ChatHeaderProps) {
  // Get the status indicator color based on chat state
  const getStatusColor = () => {
    switch(status) {
      case "chatting": return "bg-success";
      case "searching": return "bg-yellow-500";
      case "disconnected": return "bg-error";
      default: return "bg-neutral-400";
    }
  };

  // Get the status text based on chat state
  const getStatusText = () => {
    switch(status) {
      case "chatting": return "Chatting";
      case "searching": return "Searching...";
      case "disconnected": return "Disconnected";
      default: return "Idle";
    }
  };

  return (
    <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <MessageCircle className="mr-2" />
        <h1 className="text-xl font-medium">Random Chat Bot</h1>
      </div>
      <div className="flex items-center">
        <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor()} mr-2`} />
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    </header>
  );
}
