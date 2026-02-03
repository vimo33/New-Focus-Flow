import { Context } from 'telegraf';
import apiClient from '../services/api-client';
import transcriptionService from '../services/transcription';

/**
 * Capture Handler - Handles quick capture of tasks and thoughts
 *
 * Responsibilities:
 * - Process text capture requests
 * - Handle voice transcription
 * - Send captures to backend API
 * - Confirm capture receipt
 */

export async function handleCapture(ctx: Context): Promise<void> {
  try {
    // Extract text from command
    const text = ctx.text;

    if (!text) {
      await ctx.reply('Please provide text to capture.\n\nExample: /capture Buy groceries tomorrow');
      return;
    }

    // Remove /capture command from text
    const captureText = text.replace(/^\/capture\s*/i, '').trim();

    if (!captureText) {
      await ctx.reply('Please provide text to capture.\n\nExample: /capture Buy groceries tomorrow');
      return;
    }

    // Show loading indicator
    const loadingMsg = await ctx.reply('Capturing...');

    // Send to backend
    const result = await apiClient.sendCapture({
      text: captureText,
      source: 'telegram',
      metadata: {
        userId: ctx.from?.id,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name
      }
    });

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

    // Confirm success
    await ctx.reply(
      `Captured successfully!\n\n` +
      `"${captureText}"\n\n` +
      `ID: ${result.id}\n` +
      `Use /inbox to process your captured items.`
    );
  } catch (error) {
    console.error('Error in capture handler:', error);
    await ctx.reply('Failed to capture. Please check if the backend is running and try again.');
  }
}

export async function handleTextMessage(ctx: Context): Promise<void> {
  try {
    const text = ctx.text;

    if (!text) {
      return;
    }

    // Show loading indicator
    const loadingMsg = await ctx.reply('Capturing...');

    // Send to backend
    await apiClient.sendCapture({
      text: text,
      source: 'telegram',
      metadata: {
        userId: ctx.from?.id,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name
      }
    });

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

    // Confirm success
    await ctx.reply(
      `Captured!\n\n` +
      `"${text.length > 100 ? text.substring(0, 100) + '...' : text}"\n\n` +
      `Use /inbox to process it.`
    );
  } catch (error) {
    console.error('Error in text capture handler:', error);
    await ctx.reply('Failed to capture. Please check if the backend is running and try again.');
  }
}

export async function handleVoiceCapture(ctx: Context): Promise<void> {
  let loadingMsg;

  try {
    // Check if voice message exists
    if (!ctx.message || !('voice' in ctx.message)) {
      await ctx.reply('No voice message found.');
      return;
    }

    const voice = ctx.message.voice;
    const duration = voice.duration;

    // Send initial feedback
    loadingMsg = await ctx.reply(
      `🎤 Received voice message (${duration}s)\n` +
      `Transcribing...`
    );

    // Get file from Telegram
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    console.log(`📥 Downloading voice file: ${fileLink.href}`);

    // Download the file
    const response = await fetch(fileLink.href);
    if (!response.ok) {
      throw new Error(`Failed to download voice file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename with proper extension
    // Telegram voice messages are typically in OGG format
    const filename = `voice_${voice.file_id}_${Date.now()}.ogg`;

    // Update loading message
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      loadingMsg.message_id,
      undefined,
      `🎤 Voice received (${duration}s)\n` +
      `🔄 Transcribing with Whisper AI...`
    );

    // Transcribe the audio
    const transcription = await transcriptionService.transcribeFromBuffer(buffer, filename);

    // Update loading message
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      loadingMsg.message_id,
      undefined,
      `🎤 Voice received (${duration}s)\n` +
      `✅ Transcription complete\n` +
      `💾 Saving to inbox...`
    );

    // Send transcription to backend
    const result = await apiClient.sendCapture({
      text: transcription.text,
      source: 'voice',
      metadata: {
        userId: ctx.from?.id,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        voiceDuration: duration,
        transcriptionLanguage: transcription.language,
        fileId: voice.file_id,
      }
    });

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

    // Send success message with transcription
    await ctx.reply(
      `✅ Voice note captured!\n\n` +
      `📝 Transcription:\n"${transcription.text}"\n\n` +
      `🎤 Duration: ${duration}s\n` +
      `🌐 Language: ${transcription.language || 'auto-detected'}\n` +
      `🆔 ID: ${result.id}\n\n` +
      `Use /inbox to process your captured items.`
    );

    console.log(`✅ Voice transcription successful: ${transcription.text.substring(0, 50)}...`);

  } catch (error) {
    console.error('❌ Error in voice capture handler:', error);

    // Delete loading message if it exists
    if (loadingMsg) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
      } catch (deleteError) {
        // Ignore deletion errors
      }
    }

    // Send error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('OPENAI_API_KEY')) {
      await ctx.reply(
        '❌ Voice transcription is not configured.\n\n' +
        'The OpenAI API key is missing. Please contact the administrator.'
      );
    } else if (errorMessage.includes('backend') || errorMessage.includes('Backend')) {
      await ctx.reply(
        '❌ Failed to save transcription.\n\n' +
        'The backend service is unavailable. Please try again later.'
      );
    } else {
      await ctx.reply(
        '❌ Failed to process voice message.\n\n' +
        `Error: ${errorMessage}\n\n` +
        'Please try again or send a text message instead.'
      );
    }
  }
}

export async function handleImageCapture(ctx: Context): Promise<void> {
  try {
    await ctx.reply('Image processing coming soon! For now, please send text messages.');
  } catch (error) {
    console.error('Error in image capture handler:', error);
    await ctx.reply('Failed to process image. Please try again.');
  }
}
