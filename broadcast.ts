import { Express, Request, Response } from "express";
import { bot } from "./telegram/bot";
import { storage } from "./storage";

export function registerBroadcastRoutes(app: Express) {
  // Broadcast message to all bot users
  app.post('/api/broadcast/bot', async (req: Request, res: Response) => {
    try {
      // Only allow admins to use this endpoint
      // You can implement a more robust authorization check
      const adminToken = req.headers.authorization?.split(' ')[1];
      if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ 
          message: 'Unauthorized. Admin token required.' 
        });
      }

      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          message: 'Message is required' 
        });
      }

      // Get all active users
      const activeUsers = await storage.getActiveUsers();
      
      // Send message to all active users
      let sentCount = 0;
      for (const user of activeUsers) {
        try {
          await bot.telegram.sendMessage(
            parseInt(user.telegramId),
            `📢 Broadcast Message:\n\n${message}`
          );
          sentCount++;
        } catch (err) {
          console.error(`Error sending broadcast to user ${user.telegramId}:`, err);
        }
      }
      
      return res.status(200).json({ 
        message: 'Broadcast sent successfully', 
        sentCount 
      });
    } catch (error) {
      console.error('Error broadcasting to bot users:', error);
      return res.status(500).json({ 
        message: 'Failed to broadcast message' 
      });
    }
  });

  // Broadcast message to channels
  app.post('/api/broadcast/channels', async (req: Request, res: Response) => {
    try {
      // Only allow admins to use this endpoint
      const adminToken = req.headers.authorization?.split(' ')[1];
      if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ 
          message: 'Unauthorized. Admin token required.' 
        });
      }

      const { message, channels, pin } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          message: 'Message is required' 
        });
      }

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        return res.status(400).json({ 
          message: 'At least one channel is required' 
        });
      }

      // Send message to all channels
      let sentCount = 0;
      for (const channel of channels) {
        try {
          // Send message
          const sentMessage = await bot.telegram.sendMessage(
            channel,
            message
          );
          
          // If pin is true, pin the message
          if (pin && sentMessage) {
            await bot.telegram.pinChatMessage(
              channel,
              sentMessage.message_id
            );
          }
          
          sentCount++;
        } catch (err) {
          console.error(`Error sending broadcast to channel ${channel}:`, err);
        }
      }
      
      return res.status(200).json({ 
        message: 'Broadcast sent successfully', 
        sentCount 
      });
    } catch (error) {
      console.error('Error broadcasting to channels:', error);
      return res.status(500).json({ 
        message: 'Failed to broadcast message' 
      });
    }
  });
}