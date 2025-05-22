import { Telegraf } from 'telegraf';
import { BotContext } from './bot';
import { storage } from '../storage';
import { findChatPartner, endCurrentChat } from './pairing';

// Register all command handlers
export function registerCommands(bot: Telegraf<BotContext>): void {
  // Function to check channel membership
  async function checkChannelMembership(userId: number, username: string): Promise<{allMemberships: boolean, missingChannels: string[]}> {
    console.log(`Checking channel membership for user ${username} (ID: ${userId})`);
    
    const requiredChannels = ['@myanmar_leo_match', '@projectx39'];
    let allMemberships = true;
    let missingChannels: string[] = [];
    
    for (const channel of requiredChannels) {
      try {
        const memberStatus = await bot.telegram.getChatMember(channel, userId);
        if (memberStatus.status === 'left' || memberStatus.status === 'kicked' || memberStatus.status === 'restricted') {
          console.log(`User ${username} is not a member of ${channel}`);
          allMemberships = false;
          missingChannels.push(channel);
        }
      } catch (error) {
        console.error(`Error checking membership for ${channel}:`, error);
        allMemberships = false;
        missingChannels.push(channel);
      }
    }
    
    return { allMemberships, missingChannels };
  }

  // Handle "I've Joined" button callback
  bot.action('check_membership', async (ctx) => {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) clicked membership check button`);
    
    // Check channel membership
    const { allMemberships, missingChannels } = await checkChannelMembership(ctx.from.id, first_name);
    
    if (!allMemberships) {
      await ctx.answerCbQuery('You need to join all the required channels first!');
      await ctx.reply(
        `You still need to join these channels:\n` +
        missingChannels.join('\n') + '\n\n' +
        'After joining, click /start again.',
        {
          reply_markup: {
            inline_keyboard: [
              ...missingChannels.map(channel => [{ text: `Join ${channel}`, url: `https://t.me/${channel.replace('@', '')}` }]),
              [{ text: "Check Again", callback_data: 'check_membership' }]
            ]
          }
        }
      );
    } else {
      await ctx.answerCbQuery('Membership verified successfully!');
      
      // Call the start command logic
      await ctx.reply(
        `Welcome to the Random Chat Bot, ${first_name}! 👋\n\n` +
        'You have successfully joined all required channels.\n\n' +
        'This bot allows you to chat anonymously with random people.',
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
      
      // Check if user exists
      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          telegramId,
          username: ctx.from.username || undefined,
          firstName: first_name,
          lastName: ctx.from.last_name || undefined
        });
      } else {
        // Update user activity and state
        await storage.updateUserActivity(telegramId, true);
        await storage.updateUserState(telegramId, 'idle');
      }
    }
  });
  // Start command - register the user
  bot.command('start', async (ctx) => {
    const { id, username, first_name, last_name } = ctx.from;
    const telegramId = id.toString();
    
    console.log(`User ${first_name} (ID: ${telegramId}) started the bot`);
    
    // Check required channel memberships
    const requiredChannels = ['@myanmar_leo_match', '@projectx39'];
    let allMemberships = true;
    let missingChannels = [];
    
    for (const channel of requiredChannels) {
      try {
        const memberStatus = await bot.telegram.getChatMember(channel, id);
        if (memberStatus.status === 'left' || memberStatus.status === 'kicked' || memberStatus.status === 'restricted') {
          allMemberships = false;
          missingChannels.push(channel);
        }
      } catch (error) {
        console.error(`Error checking membership for ${channel}:`, error);
        // If we can't check, assume they're not a member
        allMemberships = false;
        missingChannels.push(channel);
      }
    }
    
    // If not a member of required channels, send join message
    if (!allMemberships) {
      await ctx.reply(
        `Hello ${first_name}! 👋\n\n` +
        'To use this bot, you must first join these channels:\n' +
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
    
    // Check if user exists in database
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        telegramId,
        username: username || undefined,
        firstName: first_name,
        lastName: last_name || undefined
      });
      
      await ctx.reply(
        `Welcome to the Random Chat Bot, ${first_name}! 👋\n\n` +
        'This bot allows you to chat anonymously with random people.\n\n' +
        'Use /help to see available commands.',
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
    } else {
      // Update user activity and state
      await storage.updateUserActivity(telegramId, true);
      await storage.updateUserState(telegramId, 'idle');
      
      await ctx.reply(
        `Welcome back, ${first_name}! 👋\n\n` +
        'Use /find to find a chat partner or /help to see available commands.',
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

  // Help command - show available commands
  bot.command('help', async (ctx) => {
    const { first_name } = ctx.from;
    console.log(`User ${first_name} requested help`);
    
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
  });

  // Find command - find a chat partner
  bot.command('find', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) is looking for a chat partner`);
    
    // Check if user exists
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }
    
    // Check if user is already in a chat
    if (user.state === 'chatting') {
      await ctx.reply(
        'You are already in a chat. Use /end to end it first or /leave to find a new partner.',
        {
          reply_markup: {
            keyboard: [
              [{ text: '🔍 Find New Partner' }, { text: '🚪 End Chat' }],
              [{ text: '📊 My Stats' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }

    // Check if user is already searching
    if (user.state === 'searching') {
      await ctx.reply(
        'You are already looking for a chat partner. Please wait...',
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
      return;
    }
    
    // Update user state to searching
    await storage.updateUserState(telegramId, 'searching');
    
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
    await findChatPartner(telegramId);
  });

  // Leave command - leave current partner and find a new one
  bot.command('leave', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) is leaving their chat to find a new partner`);
    
    // Check if user exists
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }
    
    // Check if user is in a chat
    if (user.state !== 'chatting') {
      await ctx.reply(
        'You are not in a chat currently. Use /find to find a chat partner.',
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
    
    // End the current chat
    await endCurrentChat(telegramId);
    
    // Update user state to searching
    await storage.updateUserState(telegramId, 'searching');
    
    await ctx.reply(
      'Left previous chat. 🔍 Looking for a new chat partner...',
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
    
    // Try to find a new chat partner
    await findChatPartner(telegramId);
  });

  // End command - end current chat
  bot.command('end', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) is ending their chat`);
    
    // Check if user exists
    const user = await storage.getUserByTelegramId(telegramId);
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
    await endCurrentChat(telegramId);
    
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
  });
  
  // Stats command - show user stats
  bot.command('stats', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) requested their stats`);
    
    // Check if user exists
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }
    
    // Get user's active chat pair if any
    const activeChatPair = await storage.getActiveChatPairByUserId(telegramId);
    
    // Get total number of messages
    const allChatPairs = Array.from((await storage.getActiveUsers()).values())
      .filter(u => u.telegramId === telegramId);
    
    await ctx.reply(
      `📊 Your Chat Statistics, ${first_name}\n\n` +
      `Current status: ${user.state.charAt(0).toUpperCase() + user.state.slice(1)}\n` +
      `Registered since: ${new Date(user.registeredAt).toLocaleDateString()}\n` +
      `Last active: ${new Date(user.lastActive).toLocaleDateString()}\n\n` +
      `${activeChatPair ? '✅ You are currently in an active chat.' : '❌ You are not in an active chat.'}\n\n` +
      'Use /find to start a new conversation!'
    );
  });
  
  // Report command - report inappropriate behavior
  bot.command('report', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    console.log(`User ${first_name} (ID: ${telegramId}) is trying to report someone`);
    
    // Check if user exists
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }
    
    // Check if user is in a chat
    if (user.state !== 'chatting') {
      await ctx.reply('You need to be in an active chat to report someone.');
      return;
    }
    
    // Get the active chat pair
    const chatPair = await storage.getActiveChatPairByUserId(telegramId);
    if (!chatPair) {
      await ctx.reply('You are not in an active chat currently.');
      return;
    }
    
    // Get the report reason
    const reason = ctx.message.text.replace('/report', '').trim();
    
    // Determine the partner
    const partnerId = chatPair.user1Id === telegramId ? chatPair.user2Id : chatPair.user1Id;
    
    // Import the report function
    const { reportUser } = await import('./pairing');
    
    // Report the user
    await reportUser(telegramId, partnerId, reason || 'No reason provided');
    
    await ctx.reply('Thank you for your report. Our moderation team will review it. Your chat has been ended for your safety.');
  });

  // Handle broadcast command (admin only)
  bot.command('broadcast', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const { first_name } = ctx.from;
    
    // Check if user exists and is admin (you can implement admin check)
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Please start the bot with /start first');
      return;
    }
    
    // Simple admin check - you can replace this with your own logic
    const isAdmin = telegramId === process.env.ADMIN_TELEGRAM_ID;
    
    if (!isAdmin) {
      console.log(`User ${first_name} (ID: ${telegramId}) tried to use admin command but is not authorized`);
      await ctx.reply('You are not authorized to use this command.');
      return;
    }
    
    // Get the broadcast message
    const message = ctx.message.text.replace('/broadcast', '').trim();
    
    if (!message) {
      await ctx.reply('Please provide a message to broadcast. Usage: /broadcast Your message here');
      return;
    }
    
    console.log(`Admin ${first_name} (ID: ${telegramId}) is broadcasting a message`);
    
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
    
    await ctx.reply(`Broadcast sent to ${sentCount} users.`);
  });
}
