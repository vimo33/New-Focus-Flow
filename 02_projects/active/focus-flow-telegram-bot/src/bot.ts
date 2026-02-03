import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import { handleCapture, handleTextMessage, handleVoiceCapture, handleImageCapture } from './handlers/capture';
import { handleInboxView, handleProcess, handleItemAction } from './handlers/inbox';
import transcriptionService from './services/transcription';

// Load environment variables
dotenv.config();

// Initialize Telegraf bot
const bot = new Telegraf<Context>(process.env.TELEGRAM_BOT_TOKEN || '');

// Set up command handlers
bot.start((ctx) => {
  const firstName = ctx.from?.first_name || 'User';
  ctx.reply(
    `Welcome to Focus Flow, ${firstName}!\n\n` +
    'I\'m your personal productivity assistant. Here\'s what I can help you with:\n\n' +
    '/capture <text> - Quick capture your thoughts\n' +
    '/inbox - Check your inbox counts\n' +
    '/inbox work - View work items\n' +
    '/inbox personal - View personal items\n' +
    '/inbox ideas - View ideas\n' +
    '/process <id> - Process a specific item\n' +
    '/help - Get help and command list\n\n' +
    'You can also:\n' +
    '• Send text messages for quick capture\n' +
    '• Send voice notes for automatic transcription'
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    'Focus Flow Bot - Available Commands:\n\n' +
    '/start - Show welcome message\n' +
    '/capture <text> - Quick capture a task or thought\n' +
    '  Example: /capture Buy groceries tomorrow\n\n' +
    '/inbox - Show inbox summary with counts\n' +
    '/inbox work - View work inbox items\n' +
    '/inbox personal - View personal inbox items\n' +
    '/inbox ideas - View ideas inbox items\n' +
    '/inbox all - View all inbox items\n\n' +
    '/process <id> - Process a specific inbox item\n' +
    '  Example: /process abc123\n\n' +
    '/help - Show this help message\n\n' +
    'Quick Tips:\n' +
    '• Just send text to capture quick notes\n' +
    '• Send voice messages for automatic transcription\n' +
    '• Use inline buttons to take actions\n' +
    '• Image support coming soon!'
  );
});

// Command handlers
bot.command('capture', handleCapture);
bot.command('inbox', handleInboxView);
bot.command('process', handleProcess);

// Handle callback queries (inline buttons)
bot.on('callback_query', handleItemAction);

// Handle text messages (auto-capture)
bot.on(message('text'), async (ctx, next) => {
  // Skip if it's a command
  if (ctx.message.text.startsWith('/')) {
    return next();
  }

  await handleTextMessage(ctx);
});

// Handle voice messages
bot.on(message('voice'), handleVoiceCapture);

// Handle photo messages
bot.on(message('photo'), handleImageCapture);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// Launch bot
bot.launch().then(() => {
  console.log('==========================================');
  console.log('Focus Flow Telegram Bot');
  console.log('==========================================');
  console.log('Bot started successfully');
  console.log('Bot is polling for messages...');
  console.log('==========================================');
  console.log('Available commands:');
  console.log('  /start - Welcome message');
  console.log('  /capture <text> - Quick capture');
  console.log('  /inbox - Show inbox counts');
  console.log('  /inbox <filter> - Show filtered items');
  console.log('  /process <id> - Process item');
  console.log('  /help - Command list');
  console.log('==========================================');
}).catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

// Enable graceful shutdown
process.once('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await transcriptionService.cleanupAllTempFiles();
  bot.stop('SIGINT');
});
process.once('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await transcriptionService.cleanupAllTempFiles();
  bot.stop('SIGTERM');
});

export default bot;
