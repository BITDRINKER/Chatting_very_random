import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBot, startBot } from "./telegram/bot";
import { WebSocketServer } from 'ws';
import { StatusEvent, WebSocketEvent } from "@shared/schema";
import { registerBroadcastRoutes } from "./broadcast";

// WebSocket clients map
const clients = new Map<string, any>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize HTTP server
  const httpServer = createServer(app);
  
  // Initialize Telegram bot
  const bot = initializeBot();
  startBot(bot);
  
  // Register broadcast routes for the admin interface
  registerBroadcastRoutes(app);
  
  // Set up WebSocket server for the web interface with path
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  console.log('WebSocket server initialized on path: /ws');
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    const clientId = Date.now().toString();
    clients.set(clientId, ws);
    
    // Send initial status
    const initialStatus: StatusEvent = {
      type: 'status',
      data: {
        state: 'idle'
      }
    };
    
    try {
      ws.send(JSON.stringify(initialStatus));
      console.log('Sent initial status to client:', clientId);
    } catch (err) {
      console.error('Error sending initial status:', err);
    }
    
    ws.on('message', async (message) => {
      try {
        console.log('Received message:', message.toString());
        const data = JSON.parse(message.toString());
        
        // Handle client messages based on their type
        if (data.type === 'find_partner') {
          console.log('Client requesting partner search');
          // Send searching status
          ws.send(JSON.stringify({
            type: 'status',
            data: {
              state: 'searching'
            }
          }));
          
          // Simulate finding a partner after delay
          setTimeout(() => {
            try {
              ws.send(JSON.stringify({
                type: 'status',
                data: {
                  state: 'chatting',
                  chatPair: {
                    id: 1,
                    partnerId: 'demo-partner',
                    partnerName: 'Random Stranger'
                  }
                }
              }));
              console.log('Partner found for client:', clientId);
            } catch (err) {
              console.error('Error sending partner found status:', err);
            }
          }, 3000);
        } 
        else if (data.type === 'end_chat') {
          console.log('Client ending chat');
          try {
            ws.send(JSON.stringify({
              type: 'status',
              data: {
                state: 'disconnected'
              }
            }));
          } catch (err) {
            console.error('Error sending end chat status:', err);
          }
        }
        else if (data.type === 'message' && data.text) {
          console.log('Client sending message:', data.text);
          // Echo the sent message back
          const sentMessage: WebSocketEvent = {
            type: 'message',
            data: {
              id: Date.now(),
              senderId: 'me', // Client will recognize this as their own
              content: data.text,
              timestamp: new Date().toISOString()
            }
          };
          
          try {
            ws.send(JSON.stringify(sentMessage));
          
            // Simulate a response after delay
            setTimeout(() => {
              const responses = [
                "That's interesting! Tell me more.",
                "I see what you mean.",
                "Hmm, I haven't thought about it that way before.",
                "Cool! What else do you like to talk about?",
                "I've had a similar experience before."
              ];
              const randomResponse = responses[Math.floor(Math.random() * responses.length)];
              
              const responseMessage: WebSocketEvent = {
                type: 'message',
                data: {
                  id: Date.now() + 1,
                  senderId: 'demo-partner',
                  content: randomResponse,
                  timestamp: new Date().toISOString()
                }
              };
              ws.send(JSON.stringify(responseMessage));
              console.log('Sent auto-response to client:', clientId);
            }, 1500);
          } catch (err) {
            console.error('Error sending message response:', err);
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
      console.log('Client disconnected:', clientId);
      clients.delete(clientId);
    });
  });
  
  // API Routes
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Bot status endpoint
  app.get('/api/status', (req, res) => {
    res.json({ 
      active: true,
      usersCount: 0, // This would come from real metrics in production
      chatsCount: 0  // This would come from real metrics in production
    });
  });

  return httpServer;
}
