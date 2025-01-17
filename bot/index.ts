import { Telegraf } from 'telegraf';
import { handleTelegramTransaction } from './handler';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.command(['expense', 'income'], async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const response = await handleTelegramTransaction(telegramId, ctx.message.text);
  return ctx.reply(response);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));