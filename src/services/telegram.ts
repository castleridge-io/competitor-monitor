import { Bot, GrammyError } from 'grammy';
import { getDb } from '../db/index.js';
import { telegramSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

let bot: Bot | null = null;

const SETTINGS_ID = 'telegram-settings-1';

export interface TelegramAlert {
  competitorName: string;
  competitorUrl: string;
  field: string;
  oldValue: string;
  newValue: string;
  reportUrl: string;
}

export interface TelegramSettingsData {
  id: string;
  chatId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    bot = new Bot(token);
  }
  return bot;
}

export async function initTelegramBot(): Promise<void> {
  const botInstance = getBot();

  // Register /start command to capture chat ID
  botInstance.command('start', async (ctx) => {
    const chatId = ctx.chat?.id?.toString();

    if (chatId) {
      // Save the chat ID to settings
      await updateTelegramSettings({ chatId });

      await ctx.reply(
        `Welcome to Competitor Monitor!\n\n` +
        `Your chat ID has been registered: ${chatId}\n\n` +
        `You will now receive alerts when competitor changes are detected.\n\n` +
        `Use /enable to turn on alerts.\n` +
        `Use /disable to turn off alerts.\n` +
        `Use /status to check current settings.`
      );
    } else {
      await ctx.reply('Unable to get chat ID. Please try again.');
    }
  });

  // Register /enable command
  botInstance.command('enable', async (ctx) => {
    const settings = await getTelegramSettings();

    if (!settings?.chatId) {
      await ctx.reply(
        'No chat ID registered. Please use /start first to register your chat.'
      );
      return;
    }

    await updateTelegramSettings({ enabled: true });
    await ctx.reply('Telegram alerts have been enabled.');
  });

  // Register /disable command
  botInstance.command('disable', async (ctx) => {
    await updateTelegramSettings({ enabled: false });
    await ctx.reply('Telegram alerts have been disabled.');
  });

  // Register /status command
  botInstance.command('status', async (ctx) => {
    const settings = await getTelegramSettings();

    if (!settings) {
      await ctx.reply(
        'Telegram is not configured. Use /start to register your chat ID.'
      );
      return;
    }

    const status = settings.enabled ? 'enabled' : 'disabled';
    const chatId = settings.chatId || 'not set';

    await ctx.reply(
      `Telegram Settings:\n\n` +
      `Status: ${status}\n` +
      `Chat ID: ${chatId}`
    );
  });

  // Start the bot
  await botInstance.start();
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    await bot.stop();
  }
}

export async function getTelegramSettings(): Promise<TelegramSettingsData | null> {
  const db = getDb();

  const results = await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.id, SETTINGS_ID))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return {
    id: row.id,
    chatId: row.chatId,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateTelegramSettings(data: {
  chatId?: string | null;
  enabled?: boolean;
}): Promise<TelegramSettingsData> {
  const db = getDb();
  const now = new Date();

  const existing = await getTelegramSettings();

  if (existing) {
    // Update existing settings
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.chatId !== undefined) {
      updateData.chatId = data.chatId;
    }
    if (data.enabled !== undefined) {
      updateData.enabled = data.enabled;
    }

    await db
      .update(telegramSettings)
      .set(updateData)
      .where(eq(telegramSettings.id, SETTINGS_ID));

    return (await getTelegramSettings())!;
  }

  // Create new settings
  await db.insert(telegramSettings).values({
    id: SETTINGS_ID,
    chatId: data.chatId ?? null,
    enabled: data.enabled ?? false,
    createdAt: now,
    updatedAt: now,
  });

  return (await getTelegramSettings())!;
}

export async function sendTelegramAlert(
  alert: TelegramAlert
): Promise<{ success: boolean; error?: string }> {
  const settings = await getTelegramSettings();

  if (!settings) {
    return { success: false, error: 'Telegram not configured' };
  }

  if (!settings.enabled) {
    return { success: false, error: 'Telegram alerts are disabled' };
  }

  if (!settings.chatId) {
    return { success: false, error: 'No chat ID configured' };
  }

  try {
    const botInstance = getBot();

    const message =
      `*Competitor Change Detected*\n\n` +
      `${alert.competitorName} changed their ${alert.field}\n\n` +
      `*Previous:* ${alert.oldValue}\n` +
      `*New:* ${alert.newValue}\n\n` +
      `[View Report](${alert.reportUrl})`;

    await botInstance.api.sendMessage(settings.chatId, message, {
      parse_mode: 'Markdown',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof GrammyError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}