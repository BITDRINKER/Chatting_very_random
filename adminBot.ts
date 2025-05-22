import { Telegraf, Context } from 'telegraf';
import { bot as mainBot } from './bot';
import { storage } from '../storage';

// Admin Bot token
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '7851319434:AAGLXwU1r9420EYMI7N0fDc3tM_uPlGoNAY';

// Password for admin authentication
const ADMIN_PASSWORD = 'Adminisking';

// Create the admin bot
export const adminBot = new Telegraf(ADMIN_BOT_TOKEN);

// Interface for admin sessions
interface AdminSession {
  authenticated: boolean;
  awaitingPassword: boolean;
  awaitingMessage: boolean;
  targetChannel?: string;
  shouldPin?: boolean;
}

// Store admin sessions
const adminSessions = new Map<string, AdminSession>();

// Initialize admin bot
export function initializeAdminBot(): Telegraf<Context> {
  // Start command - authenticate the admin
  adminBot.command('start', async (ctx) => {
    if (!ctx.from) return;
    
    const adminId = ctx.from.id.toString();
    
    // Initialize session
    adminSessions.set(adminId, {
      authenticated: false,
      awaitingPassword: true,
      awaitingMessage: false
    });
    
    await ctx.reply(
      'Welcome to the Admin Bot! 👮‍♂️\n\n' +
      'Please enter the admin password to continue:',
      {
        reply_markup: {
          remove_keyboard: true
        }
      }
    );
  });
  
  // Handle incoming text messages
  adminBot.on('text', async (ctx) => {
    if (!ctx.from) return;
    
    const adminId = ctx.from.id.toString();
    const messageText = ctx.message.text;
    const session = adminSessions.get(adminId);
    
    if (!session) {
      await ctx.reply('Please use /start to begin the admin session.');
      return;
    }
    
    // Check if waiting for password
    if (session.awaitingPassword) {
      if (messageText === ADMIN_PASSWORD) {
        session.authenticated = true;
        session.awaitingPassword = false;
        
        await ctx.reply(
          '✅ Password correct! You are now authenticated as an admin.\n\n' +
          'Select target to broadcast message:',
          {
            reply_markup: {
              keyboard: [
                [{ text: 'A. @myanmar_leo_match' }, { text: 'B. @projectx39' }],
                [{ text: 'C. Chat Bot (All Users)' }]
              ],
              resize_keyboard: true
            }
          }
        );
      } else {
        await ctx.reply('❌ Incorrect password. Please try again:');
      }
      return;
    }
    
    // Not authenticated
    if (!session.authenticated) {
      await ctx.reply('You are not authenticated. Please use /start to authenticate.');
      return;
    }
    
    // Process channel selection
    if (messageText.startsWith('A.') || messageText === 'A. @myanmar_leo_match') {
      session.targetChannel = '@myanmar_leo_match';
      session.awaitingMessage = true;
      
      await ctx.reply(
        `Selected: ${session.targetChannel}\n\n` +
        'Do you want to pin this message?',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Yes, pin message' }, { text: 'No, just send' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    if (messageText.startsWith('B.') || messageText === 'B. @projectx39') {
      session.targetChannel = '@projectx39';
      session.awaitingMessage = true;
      
      await ctx.reply(
        `Selected: ${session.targetChannel}\n\n` +
        'Do you want to pin this message?',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Yes, pin message' }, { text: 'No, just send' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    if (messageText.startsWith('C.') || messageText === 'C. Chat Bot (All Users)') {
      session.targetChannel = 'chat_bot';
      session.awaitingMessage = true;
      
      await ctx.reply(
        'Selected: Chat Bot (All Users)\n\n' +
        'Type your message to broadcast to all bot users:',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Cancel Broadcast' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    // Handle pin preference
    if (messageText === 'Yes, pin message') {
      session.shouldPin = true;
      
      await ctx.reply(
        `You've chosen to pin your message in ${session.targetChannel}.\n\n` +
        'Now type your message to broadcast:',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Cancel Broadcast' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    if (messageText === 'No, just send') {
      session.shouldPin = false;
      
      await ctx.reply(
        `You've chosen not to pin your message in ${session.targetChannel}.\n\n` +
        'Now type your message to broadcast:',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Cancel Broadcast' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    // Cancel broadcast
    if (messageText === 'Cancel Broadcast') {
      session.awaitingMessage = false;
      session.targetChannel = undefined;
      session.shouldPin = undefined;
      
      await ctx.reply(
        '❌ Broadcast canceled.\n\n' +
        'Select target to broadcast message:',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'A. @myanmar_leo_match' }, { text: 'B. @projectx39' }],
              [{ text: 'C. Chat Bot (All Users)' }]
            ],
            resize_keyboard: true
          }
        }
      );
      return;
    }
    
    // Handle actual broadcast message
    if (session.awaitingMessage && session.targetChannel) {
      if (messageText.length < 2) {
        await ctx.reply('Message too short. Please type a longer message:');
        return;
      }
      
      try {
        // Reset awaiting message flag
        session.awaitingMessage = false;
        
        // Broadcast to channel
        if (session.targetChannel !== 'chat_bot') {
          // Send message to channel
          const sentMsg = await adminBot.telegram.sendMessage(
            session.targetChannel,
            messageText
          );
          
          // Pin if requested
          if (session.shouldPin && sentMsg) {
            await adminBot.telegram.pinChatMessage(
              session.targetChannel,
              sentMsg.message_id
            );
          }
          
          await ctx.reply(
            `✅ Message successfully sent to ${session.targetChannel}${session.shouldPin ? ' and pinned' : ''}!`,
            {
              reply_markup: {
                keyboard: [
                  [{ text: 'A. @myanmar_leo_match' }, { text: 'B. @projectx39' }],
                  [{ text: 'C. Chat Bot (All Users)' }]
                ],
                resize_keyboard: true
              }
            }
          );
        } 
        // Broadcast to all chat bot users
        else {
          // Get all active users
          const activeUsers = await storage.getActiveUsers();
          let sentCount = 0;
          
          // Format admin message
          const adminMessage = `📢 Message from Admin:\n\n${messageText}`;
          
          // Send to all active users
          for (const user of activeUsers) {
            try {
              await mainBot.telegram.sendMessage(
                parseInt(user.telegramId),
                adminMessage
              );
              sentCount++;
            } catch (err) {
              console.error(`Error sending admin message to user ${user.telegramId}:`, err);
            }
          }
          
          await ctx.reply(
            `✅ Message successfully sent to ${sentCount} bot users!`,
            {
              reply_markup: {
                keyboard: [
                  [{ text: 'A. @myanmar_leo_match' }, { text: 'B. @projectx39' }],
                  [{ text: 'C. Chat Bot (All Users)' }]
                ],
                resize_keyboard: true
              }
            }
          );
        }
        
        // Reset target channel
        session.targetChannel = undefined;
        session.shouldPin = undefined;
        
      } catch (error) {
        console.error('Error sending broadcast:', error);
        
        await ctx.reply(
          '❌ Error sending broadcast. Please try again.',
          {
            reply_markup: {
              keyboard: [
                [{ text: 'A. @myanmar_leo_match' }, { text: 'B. @projectx39' }],
                [{ text: 'C. Chat Bot (All Users)' }]
              ],
              resize_keyboard: true
            }
          }
        );
      }
    }
  });
  
  // Handle errors
  adminBot.catch((err, ctx) => {
    console.error('Admin bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
  });
  
  return adminBot;
}

// Start the admin bot
export function startAdminBot(bot: Telegraf<Context>): void {
  bot.launch({
    dropPendingUpdates: true,
    allowedUpdates: ['message', 'callback_query']
  })
    .then(() => {
      console.log('Admin bot started successfully');
    })
    .catch(err => {
      console.error('Failed to start admin bot:', err);
      console.log('This is likely because the admin bot is already running elsewhere.');
      // Don't exit the process
    });
    
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}