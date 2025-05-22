import { Telegraf, Context } from 'telegraf';
import { storage } from '../storage';
import { registerCommands } from './commands';
import { handleIncomingMessage, handleChatPartnerDisconnect, findChatPartner, endCurrentChat } from './pairing';

// Environment variable for the bot token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables!');
  process.exit(1);
}

// Create a new Telegraf instance
export const bot = new Telegraf(BOT_TOKEN);

// Custom context type
export interface BotContext extends Context {
  chatState?: {
    state: string;
    partnerId?: string;
  };
}

// Initialize the bot
export function initializeBot(): Telegraf<BotContext> {
  // Register command handlers
  registerCommands(bot);
  
  // Handle regular text messages (non-commands)
  bot.on('text', async (ctx) => {
    if (!ctx.message || !ctx.from) {
      console.error('Missing context information');
      return;
    }
    
    // Ignore commands
    const message = ctx.message.text;
    if (message.startsWith('/')) return;
    
    // Get the sender's Telegram ID
    const senderId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    // First check channel membership before processing any message
    const requiredChannels = ['@myanmar_leo_match', '@projectx39'];
    let allMemberships = true;
    let missingChannels = [];
    
    for (const channel of requiredChannels) {
      try {
        const memberStatus = await bot.telegram.getChatMember(channel, ctx.from.id);
        if (memberStatus.status === 'left' || memberStatus.status === 'kicked' || memberStatus.status === 'restricted') {
          console.log(`User ${first_name} (ID: ${senderId}) is not a member of ${channel}`);
          allMemberships = false;
          missingChannels.push(channel);
        }
      } catch (error) {
        console.error(`Error checking membership for ${channel}:`, error);
        allMemberships = false;
        missingChannels.push(channel);
      }
    }
    
    // If not a member of required channels, send join message and block further action
    if (!allMemberships) {
      console.log(`User ${first_name} (ID: ${senderId}) has left required channels, blocking bot access`);
      
      await ctx.reply(
        `❌ You've left one or more required channels.\n\n` +
        `To continue using this bot, you must rejoin:\n` +
        missingChannels.join('\n') + '\n\n' +
        'After joining, click /start again.',
        {
          reply_markup: {
            inline_keyboard: [
              ...missingChannels.map(channel => [{ text: `Join ${channel}`, url: `https://t.me/${channel.replace('@', '')}` }]),
              [{ text: "I've Joined", callback_data: 'check_membership' }]
            ]
          }
        }
      );
      return;
    }
    
    // Handle button presses
    if (message === '🔍 Find Partner' || message === '🔍 Find New Partner') {
      // Trigger the find command
      console.log(`User ${first_name} (ID: ${senderId}) clicked Find Partner button`);
      
      // Find the user
      const user = await storage.getUserByTelegramId(senderId);
      if (!user) {
        await ctx.reply('Please start the bot with /start first');
        return;
      }
      
      // Check if user is already in a chat
      if (user.state === 'chatting') {
        await ctx.reply('You are already in a chat. Use /end to end it first or /leave to find a new partner.');
        return;
      }
      
      // Check if user is already searching
      if (user.state === 'searching') {
        await ctx.reply('You are already looking for a chat partner. Please wait...');
        return;
      }
      
      // Update user state to searching
      await storage.updateUserState(senderId, 'searching');
      
      await ctx.reply(
        '🔍 Looking for a chat partner...',
        {
          reply_markup: {
            keyboard: [
              [{ text: '🛑 Cancel Search' }],
              [{ text: '📊 My Stats' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true
          }
        }
      );
      
      // Try to find a chat partner
      await findChatPartner(senderId);
      return;
    }
    
    if (message === '🚪 End Chat') {
      // Trigger the end command
      console.log(`User ${first_name} (ID: ${senderId}) clicked End Chat button`);
      
      // Find the user
      const user = await storage.getUserByTelegramId(senderId);
      if (!user) {
        await ctx.reply('Please start the bot with /start first');
        return;
      }
      
      // Check if user is in a chat
      if (user.state !== 'chatting') {
        await ctx.reply(
          'You are not in a chat currently.',
          {
            reply_markup: {
              keyboard: [
                [{ text: '🔍 Find Partner' }],
                [{ text: '📊 My Stats' }, { text: '❓ Help' }]
              ],
              resize_keyboard: true
            }
          }
        );
        return;
      }
      
      // End the chat
      await endCurrentChat(senderId);
      
      await ctx.reply(
        'Chat ended. Use /find to find a new chat partner.',
        {
          reply_markup: {
            keyboard: [
              [{ text: '🔍 Find Partner' }],
              [{ text: '📊 My Stats' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    if (message === '🛑 Cancel Search') {
      // Cancel the search
      console.log(`User ${first_name} (ID: ${senderId}) clicked Cancel Search button`);
      
      // Find the user
      const user = await storage.getUserByTelegramId(senderId);
      if (!user) {
        await ctx.reply('Please start the bot with /start first');
        return;
      }
      
      // Check if user is searching
      if (user.state !== 'searching') {
        await ctx.reply('You are not currently searching for a partner.');
        return;
      }
      
      // Update user state to idle
      await storage.updateUserState(senderId, 'idle');
      
      await ctx.reply(
        'Search cancelled. You can use /find to start searching again.',
        {
          reply_markup: {
            keyboard: [
              [{ text: '🔍 Find Partner' }],
              [{ text: '📊 My Stats' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    if (message === '📊 My Stats') {
      // Trigger the stats command
      console.log(`User ${first_name} (ID: ${senderId}) clicked My Stats button`);
      
      // Find the user
      const user = await storage.getUserByTelegramId(senderId);
      if (!user) {
        await ctx.reply('Please start the bot with /start first');
        return;
      }
      
      // Get user's active chat pair if any
      const activeChatPair = await storage.getActiveChatPairByUserId(senderId);
      
      await ctx.reply(
        `📊 Your Chat Statistics, ${first_name}\n\n` +
        `Current status: ${user.state.charAt(0).toUpperCase() + user.state.slice(1)}\n` +
        `Registered since: ${new Date(user.registeredAt).toLocaleDateString()}\n` +
        `Last active: ${new Date(user.lastActive).toLocaleDateString()}\n\n` +
        `${activeChatPair ? '✅ You are currently in an active chat.' : '❌ You are not in an active chat.'}\n\n` +
        'Use /find to start a new conversation!'
      );
      return;
    }
    
    if (message === '❓ Help') {
      // Trigger the help command
      console.log(`User ${first_name} (ID: ${senderId}) clicked Help button`);
      
      await ctx.reply(
        '📋 Available commands:\n\n' +
        '/start - Start the bot and register\n' +
        '/help - Show this help message\n' +
        '/find - Find a random chat partner\n' +
        '/leave - Leave current partner and find a new one\n' +
        '/end - End your current conversation\n' +
        '/stats - Show your chat statistics\n\n' +
        'Simply type a message to chat with your partner once connected!'
      );
      return;
    }
    
    // Find the user
    const user = await storage.getUserByTelegramId(senderId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }

    // If the user is in a chat, forward the message to their partner
    if (user.state === 'chatting') {
      await handleIncomingMessage(ctx);
    } else {
      await ctx.reply(
        'You are not in a chat. Use /find to find a chat partner.',
        {
          reply_markup: {
            keyboard: [
              [{ text: '🔍 Find Partner' }],
              [{ text: '📊 My Stats' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true
          }
        }
      );
    }
  });

  // Handle when a user leaves
  bot.on('left_chat_member', async (ctx) => {
    if (!ctx.message || !ctx.message.left_chat_member) {
      console.error('Missing left_chat_member information');
      return;
    }
    
    if (ctx.message.left_chat_member.id === ctx.botInfo?.id) {
      // Bot was removed from a chat
      return;
    }
    
    const userId = ctx.message.left_chat_member.id.toString();
    await handleChatPartnerDisconnect(userId);
  });

  // Error handling
  bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
    ctx.reply('An error occurred while processing your request. Please try again later.');
  });

  return bot;
}

// Start the bot
export function startBot(bot: Telegraf<BotContext>): void {
  bot.launch({
    dropPendingUpdates: true,
    allowedUpdates: ['message', 'callback_query']
  })
    .then(() => {
      console.log('Telegram bot started successfully');
    })
    .catch(err => {
      console.error('Failed to start Telegram bot:', err);
      console.log('This is likely because the bot is already running elsewhere.');
      // Don't exit the process, as we still want the web server to run
    });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
