import TelegramBot from "node-telegram-bot-api";

const blackdragonInfo = {
  price: undefined,
  marketcap: undefined,
  liquidity: undefined,
  "24h_volume": undefined,
  "24h_priceChange": undefined,
};

const subscriptDict = {
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
  0: "₀",
};

const delay = async (ms) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const updatePrice = async () => {
  const response = await fetch(
    "https://api.dexscreener.com/latest/dex/pairs/near/refv1-4276"
  );
  const info = await response.json();

  const price = Number(info.pair.priceUsd).toExponential();
  let actualPrice;
  const [actual, exponent] = price.split("e");
  if (exponent.includes("-")) {
    const magnitude = String(Number(exponent.replace("-", "")) - 1);
    let subscript = "";
    if (Number(magnitude) > 0) {
      for (let i = 0; i < magnitude.length; i++) {
        subscript += `${subscriptDict[magnitude[i]]}`;
      }

      const parsedActual = Number(actual).toFixed(3).replace(".", "");
      actualPrice = `$0.0${subscript}${parsedActual}`;
    } else {
      const parsedActual = Number(price).toFixed(3);
      actualPrice = `$${parsedActual}`;
    }
  } else {
    const parsedActual = Number(price).toFixed(3);
    actualPrice = `$${parsedActual}`;
  }

  blackdragonInfo.price = actualPrice;
  blackdragonInfo.marketcap = `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(Number(price) * 1e14)}`;
  blackdragonInfo.liquidity = `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(info.pair.liquidity.usd)}`;
  blackdragonInfo["24h_volume"] = `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(info.pair.volume.h24)}`;
  blackdragonInfo["24h_priceChange"] = `(${
    info.pair.priceChange.h24 > 0 ? "+" : ""
  }${info.pair.priceChange.h24.toFixed(2)}% | 24h)`;
};

const loop = async () => {
  await delay(process.env.PRICE_UPDATE_DELAY);
  console.log("updating price...");
  await updatePrice();
  console.log("price updated...");
  loop();
};

const runBot = () => {
  const token = process.env.TG_BOT_TOKEN;
  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/dragon/, async (msg) => {
    let message = "⬛ <b>$BLACKDRAGON</b> 🐉\n";
    message += `\n`;
    message += `Price: <b>${blackdragonInfo.price} ${blackdragonInfo["24h_priceChange"]}</b>\n`;
    message += `Marketcap: <b>${blackdragonInfo.marketcap}</b>\n`;
    message += `Liquidity: <b>${blackdragonInfo.liquidity}</b>\n`;
    message += `Volume (24h): <b>${blackdragonInfo["24h_volume"]}</b>\n`;
    message += `\n`;
    message += `📊 <a href='https://dexscreener.com/near/refv1-4276'>Chart</a> 🔁 <a href='https://app.ref.finance/#near|blackdragon.tkn.near'>Trade</a>`;
    bot.sendMessage(msg.chat.id, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });

  console.log("bot is now running...");
};

const bootstrap = async () => {
  console.log("bootstrapping...");
  await updatePrice();
  console.log("price instantiated...");
  runBot();

  // infinite loop
  loop();
};

bootstrap();
