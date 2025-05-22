import { useState } from "react";
import { ChatState } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Phone, Send, Smile } from "lucide-react";

interface ChatControlsProps {
  state: ChatState;
  findPartner: () => void;
  endChat: () => void;
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

export default function ChatControls({ 
  state, 
  findPartner, 
  endChat, 
  sendMessage,
  isConnected
}: ChatControlsProps) {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && message.trim()) {
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-neutral-200 p-4">
      {/* Actions */}
      <div className="flex justify-center space-x-3 mb-4">
        <Button
          onClick={findPartner}
          disabled={state === 'searching' || state === 'chatting'}
          className="flex items-center bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-full shadow-sm transition duration-200 ease-in-out"
        >
          <Search className="mr-1 h-4 w-4" />
          Find Chat Partner
        </Button>
        <Button
          onClick={endChat}
          disabled={state !== 'chatting'}
          variant="outline"
          className="flex items-center bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-medium py-2 px-4 rounded-full shadow-sm transition duration-200 ease-in-out"
        >
          <Phone className="mr-1 h-4 w-4" />
          End Chat
        </Button>
      </div>

      {/* Message Input - Enabled when in chat */}
      {state === 'chatting' ? (
        <div className="flex items-center bg-neutral-100 rounded-full overflow-hidden pr-2">
          <button className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary">
            <Smile className="h-5 w-5" />
          </button>
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border-0 bg-transparent py-3 px-2 focus:ring-0"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        /* Disabled Message Input */
        <div className="flex items-center bg-neutral-100 rounded-full overflow-hidden pr-2 opacity-70">
          <button disabled className="flex items-center justify-center p-2 text-neutral-400">
            <Smile className="h-5 w-5" />
          </button>
          <Input
            type="text"
            disabled
            placeholder={
              state === 'searching' 
                ? "Searching for a partner..." 
                : "Find a partner to start chatting..."
            }
            className="flex-1 border-0 bg-transparent py-3 px-2 text-neutral-400"
          />
          <Button
            disabled
            size="icon"
            className="h-10 w-10 rounded-full bg-neutral-300 text-neutral-500"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
