import { useState, useEffect, useCallback, useRef } from "react";
import { ChatState, ChatMessageType, WebSocketEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function useChatSocket() {
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerName, setPartnerName] = useState<string | undefined>(undefined);
  const [partnerId, setPartnerId] = useState<string | undefined>(undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Connect to WebSocket
  useEffect(() => {
    // Determine protocol (ws: for http, wss: for https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "You are now connected to the chat server.",
        duration: 3000
      });
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server. Please try again later.",
        variant: "destructive"
      });
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent;
        
        if (data.type === 'status') {
          setChatState(data.data.state);
          
          // If we're now chatting with someone, store their info
          if (data.data.state === 'chatting' && data.data.chatPair) {
            setPartnerId(data.data.chatPair.partnerId);
            setPartnerName(data.data.chatPair.partnerName);
          }
          
          // If we're disconnected or idle, clear partner info
          if (data.data.state === 'disconnected' || data.data.state === 'idle') {
            setPartnerId(undefined);
            setPartnerName(undefined);
          }
        }
        else if (data.type === 'message') {
          setMessages(prev => [...prev, data.data]);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };
    
    socketRef.current = socket;
    
    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [toast]);

  // Find a chat partner
  const findPartner = useCallback(() => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "You are not connected to the chat server.",
        variant: "destructive"
      });
      return;
    }
    
    setMessages([]);
    socketRef.current?.send(JSON.stringify({ 
      type: 'find_partner' 
    }));
  }, [isConnected, toast]);

  // End the current chat
  const endChat = useCallback(() => {
    if (!isConnected) {
      return;
    }
    
    socketRef.current?.send(JSON.stringify({ 
      type: 'end_chat' 
    }));
  }, [isConnected]);

  // Send a message
  const sendMessage = useCallback((text: string) => {
    if (!isConnected || chatState !== 'chatting') {
      return;
    }
    
    socketRef.current?.send(JSON.stringify({ 
      type: 'message',
      text 
    }));
  }, [isConnected, chatState]);

  return {
    chatState,
    messages,
    isConnected,
    partnerName,
    partnerId,
    findPartner,
    endChat,
    sendMessage
  };
}
