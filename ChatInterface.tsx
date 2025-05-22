import { useRef, useEffect } from "react";
import { ChatState, ChatMessageType } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageBubble from "@/components/MessageBubble";
import SystemMessage from "@/components/SystemMessage";

interface ChatInterfaceProps {
  state: ChatState;
  messages: ChatMessageType[];
  findPartner: () => void;
  endChat: () => void;
  partnerName?: string;
}

export default function ChatInterface({ 
  state, 
  messages, 
  findPartner,
  endChat,
  partnerName
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome state (initial)
  if (state === "idle") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4">
          <MessageCircleIcon className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-neutral-900">Welcome to Random Chat Bot!</h2>
        <p className="text-neutral-600 mb-6">Chat anonymously with random people from around the world.</p>
        <Button 
          onClick={findPartner}
          className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-full transition duration-200 flex items-center"
        >
          <PlayIcon className="mr-2 h-5 w-5" />
          Start Chatting
        </Button>
        
        <div className="mt-8 bg-neutral-100 rounded-lg p-3 w-full max-w-sm">
          <p className="font-medium mb-2">Available commands:</p>
          <ul className="text-sm space-y-1 font-mono">
            <li><span className="text-primary font-medium">/start</span> - Start the bot</li>
            <li><span className="text-primary font-medium">/help</span> - Show available commands</li>
            <li><span className="text-primary font-medium">/find</span> - Find a chat partner</li>
            <li><span className="text-primary font-medium">/end</span> - End current conversation</li>
          </ul>
        </div>
      </div>
    );
  }

  // Searching state
  if (state === "searching") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-semibold mb-2 text-neutral-900">Finding a chat partner...</h2>
        <p className="text-neutral-600 mb-6">Please wait while we connect you with someone.</p>
        <Button 
          onClick={endChat}
          variant="outline"
          className="bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-medium py-2 px-6 rounded-full transition duration-200"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Disconnected state
  if (state === "disconnected") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-error flex items-center justify-center mb-4 text-white">
          <LinkBreakIcon className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-neutral-900">Chat Ended</h2>
        <p className="text-neutral-600 mb-6">Your chat partner has disconnected.</p>
        <Button 
          onClick={findPartner}
          className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-full transition duration-200 flex items-center"
        >
          <SearchIcon className="mr-2 h-5 w-5" />
          Find a New Partner
        </Button>
      </div>
    );
  }

  // Chat state (active conversation)
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Chat Partner Info */}
      <div className="bg-white p-3 border-b flex items-center">
        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center mr-3">
          <UserIcon className="h-5 w-5 text-neutral-500" />
        </div>
        <div>
          <p className="font-medium text-neutral-900">{partnerName || "Random Stranger"}</p>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-success mr-1"></span>
            <span className="text-xs text-neutral-500">Online</span>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <SystemMessage>
          You are now chatting with a random stranger
        </SystemMessage>
        
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isMine={message.senderId === 'me'} 
          />
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// Icons
function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

function LinkBreakIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M18.28 11.04l-2.47 2.47-2.45-2.46 2.47-2.47a3.07 3.07 0 0 0 0-4.37 3.1 3.1 0 0 0-4.38 0L9 6.7 6.61 4.31 9 1.92A5.34 5.34 0 0 1 16.58 9.5l1.7-1.71"></path>
      <path d="M9.72 19.61l-2.47-2.47 2.45-2.45 2.47 2.47a3.1 3.1 0 0 0 4.38 0 3.07 3.07 0 0 0 0-4.37L14.1 10.33l2.39-2.39 2.45 2.45a5.34 5.34 0 0 1-7.58 7.58l-1.64-1.64"></path>
      <line x1="6" y1="18" x2="18" y2="6"></line>
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
