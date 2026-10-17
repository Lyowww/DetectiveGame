import { configureBot } from "../src/server/telegram/bot";

configureBot()
  .then((result) => {
    console.log(result.ok ? "Telegram bot menu, commands, and webhook are set." : result.reason ?? "Telegram setup did not complete.");
    if (!result.ok) process.exit(1);
  })
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
