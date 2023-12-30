import TelegramBot from "node-telegram-bot-api";
import {
  estimateSwap,
  ftGetTokenMetadata,
  fetchAllPools,
  getPoolByIds,
} from "@ref-finance/ref-sdk";

const blackdragonInfo = {
  price: undefined,
  marketcap: undefined,
  liquidity: undefined,
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
  const bd2wnearPool = await getPoolByIds([4276]);
  const { simplePools } = await fetchAllPools();
  const blackdragon = await ftGetTokenMetadata("blackdragon.tkn.near");
  const wnear = await ftGetTokenMetadata("wrap.near");
  const bd2wn = await estimateSwap({
    tokenIn: blackdragon,
    tokenOut: wnear,
    amountIn: "1",
    simplePools: bd2wnearPool,
  });

  const usdt = await ftGetTokenMetadata(
    "dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near"
  );
  const usdt2wn = await estimateSwap({
    tokenIn: wnear,
    tokenOut: usdt,
    amountIn: "1",
    simplePools,
  });

  let actualPrice;
  const price = (
    Number(bd2wn[0].estimate) * Number(usdt2wn[0].estimate)
  ).toExponential();
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

  // compute liquidity
  const liqBd =
    (Number(bd2wnearPool[0].supplies["blackdragon.tkn.near"]) / 1e24) *
    Number(bd2wn[0].estimate) *
    Number(usdt2wn[0].estimate);
  const liqWnear =
    (Number(bd2wnearPool[0].supplies["wrap.near"]) / 1e24) *
    Number(usdt2wn[0].estimate);

  blackdragonInfo.price = actualPrice;
  blackdragonInfo.marketcap = `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(Number(price) * 1e14)}`;
  blackdragonInfo.liquidity = `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(liqBd + liqWnear)}`;
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
    message += `Price: <b>${blackdragonInfo.price}</b>\n`;
    message += `Marketcap: <b>${blackdragonInfo.marketcap}</b>\n`;
    message += `Liquidity: <b>${blackdragonInfo.liquidity}</b>\n`;
    message += `\n`;
    message += `📊 <a href='https://dexscreener.com/near/refv1-4276'>Chart</a> 🔁 <a href='https://app.ref.finance/#near|blackdragon.tkn.near'>Trade</a>`;
    // message += `🔁 <a href='https://app.ref.finance/#near|blackdragon.tkn.near'>Trade</a>`;
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
