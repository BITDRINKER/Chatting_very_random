import { Context } from 'telegraf';
import { BotContext, bot } from './bot';
import { storage } from '../storage';

// Find a chat partner for a user
export async function findChatPartner(telegramId: string): Promise<void> {
  try {
    // Get users who are searching for a chat partner
    const searchingUsers = await storage.getUsersInState('searching');
    
    // Remove the current user from the list
    const potentialPartners = searchingUsers.filter(user => user.telegramId !== telegramId);
    
    if (potentialPartners.length > 0) {
      // Get a random partner
      const randomIndex = Math.floor(Math.random() * potentialPartners.length);
      const partner = potentialPartners[randomIndex];
      
      console.log(`Pairing users: ${telegramId} with ${partner.telegramId}`);
      
      // Create a new chat pair
      const chatPair = await storage.createChatPair({
        user1Id: telegramId,
        user2Id: partner.telegramId
      });
      
      // Update both users' states
      await storage.updateUserState(telegramId, 'chatting');
      await storage.updateUserState(partner.telegramId, 'chatting');
      
      // Get user information for personalized messages
      const user = await storage.getUserByTelegramId(telegramId);
      const partnerUser = await storage.getUserByTelegramId(partner.telegramId);
      
      // Notify both users - provide more information about the match
      await bot.telegram.sendMessage(
        parseInt(telegramId),
        `✅ Chat partner found!\n\nYou are now chatting with a random stranger. Say hello! 👋\n\nRemember to be respectful and follow the chat rules. Use /end when you want to finish this conversation.`
      );
      
      await bot.telegram.sendMessage(
        parseInt(partner.telegramId),
        `✅ Chat partner found!\n\nYou are now chatting with a random stranger. Say hello! 👋\n\nRemember to be respectful and follow the chat rules. Use /end when you want to finish this conversation.`
      );
      
      console.log(`Successfully paired ${user?.firstName || telegramId} with ${partnerUser?.firstName || partner.telegramId}`);
    } else {
      console.log(`No matching partners found for user ${telegramId}, keeping in searching state`);
      
      // Periodically check for partners again if none were found
      setTimeout(async () => {
        // Check if user is still searching
        const user = await storage.getUserByTelegramId(telegramId);
        if (user && user.state === 'searching') {
          await findChatPartner(telegramId);
        }
      }, 10000); // Try again after 10 seconds
    }
  } catch (error) {
    console.error('Error finding chat partner:', error);
  }
}

// Handle incoming chat messages
export async function handleIncomingMessage(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.from || !ctx.message) {
      console.error('Missing context information in handleIncomingMessage');
      return;
    }
    
    const senderId = ctx.from.id.toString();
    const messageText = 'text' in ctx.message ? ctx.message.text : '';
    const firstName = ctx.from.first_name || 'Unknown';
    
    console.log(`Message from ${firstName} (ID: ${senderId}): ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);
    
    // If no text in message, ignore it (could be a sticker, photo, etc.)
    if (!messageText) {
      await ctx.reply('Only text messages are supported at the moment.');
      return;
    }
    
    // Get the active chat pair for this user
    const chatPair = await storage.getActiveChatPairByUserId(senderId);
    if (!chatPair) {
      await ctx.reply('You are not in an active chat. Use /find to find a chat partner.');
      return;
    }
    
    // Determine the recipient
    const recipientId = chatPair.user1Id === senderId ? chatPair.user2Id : chatPair.user1Id;
    
    // Check if recipient is still active
    const recipientUser = await storage.getUserByTelegramId(recipientId);
    if (!recipientUser || !recipientUser.isActive) {
      await ctx.reply('Your chat partner seems to be disconnected. The chat has been ended.');
      await endCurrentChat(senderId);
      return;
    }
    
    // Store the message
    const message = await storage.createMessage({
      chatPairId: chatPair.id,
      senderId,
      receiverId: recipientId,
      content: messageText
    });
    
    console.log(`Message sent from ${senderId} to ${recipientId} (ID: ${message.id})`);
    
    // Forward the message to the recipient
    await bot.telegram.sendMessage(parseInt(recipientId), messageText);
  } catch (error) {
    console.error('Error handling message:', error);
    if (ctx.reply) {
      await ctx.reply('Failed to send your message. Please try again.');
    }
  }
}

// End the current chat for a user
export async function endCurrentChat(telegramId: string): Promise<void> {
  try {
    // Get the active chat pair
    const chatPair = await storage.getActiveChatPairByUserId(telegramId);
    if (!chatPair) {
      console.log(`No active chat found for user ${telegramId}`);
      return;
    }
    
    // Determine the partner
    const partnerId = chatPair.user1Id === telegramId ? chatPair.user2Id : chatPair.user1Id;
    
    // Get user information
    const user = await storage.getUserByTelegramId(telegramId);
    const partnerUser = await storage.getUserByTelegramId(partnerId);
    
    console.log(`Ending chat between ${user?.firstName || telegramId} and ${partnerUser?.firstName || partnerId}`);
    
    // End the chat pair
    await storage.endChatPair(chatPair.id);
    
    // Update user states
    await storage.updateUserState(telegramId, 'idle');
    await storage.updateUserState(partnerId, 'idle');
    
    // Notify the partner with a friendly message
    try {
      await bot.telegram.sendMessage(
        parseInt(partnerId),
        'Your chat partner has ended the conversation. We hope you had a good chat! Use /find to find a new partner.'
      );
    } catch (err) {
      console.error('Error notifying partner about chat end:', err);
    }
    
    console.log(`Chat ended successfully between ${telegramId} and ${partnerId}`);
  } catch (error) {
    console.error('Error ending chat:', error);
  }
}

// Handle when a user disconnects
export async function handleChatPartnerDisconnect(telegramId: string): Promise<void> {
  try {
    console.log(`User ${telegramId} disconnected from the bot`);
    
    // Update user activity
    await storage.updateUserActivity(telegramId, false);
    
    // End any active chats
    await endCurrentChat(telegramId);
  } catch (error) {
    console.error('Error handling user disconnect:', error);
  }
}

// Function to handle reports or blocked users (for moderation)
export async function reportUser(reporterId: string, reportedId: string, reason: string): Promise<void> {
  try {
    console.log(`User ${reporterId} reported user ${reportedId} for: ${reason}`);
    
    // Here you would implement your reporting logic
    // For example, storing the report in a database, notifying admins, etc.
    
    // End the current chat between the users
    await endCurrentChat(reporterId);
    
    // Notify the reporter
    await bot.telegram.sendMessage(
      parseInt(reporterId),
      'Thank you for your report. Our moderation team will review it. Your chat has been ended for your safety.'
    );
    
  } catch (error) {
    console.error('Error handling user report:', error);
  }
}
