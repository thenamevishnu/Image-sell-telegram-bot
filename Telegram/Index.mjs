import telegramController from "../Controller/telegram.controller.mjs";
import Bot from "./Config.mjs";

Bot.onText(/\/start(?: (.+))?|🔙 Back/, telegramController.start)
Bot.onText(/⭐ Shop/, telegramController.shop)
Bot.onText(/💫 Custom/, telegramController.custom)
Bot.onText(/🛒 Cart/, telegramController.cart)
Bot.onText(/🛒 Pre-Drop/, telegramController.preCart)
Bot.onText(/🛒 Custom-Drop/, telegramController.customCart)
Bot.onText(/📃 Orders/, telegramController.orders)
Bot.onText(/📃 Pre-Drop Orders/, telegramController.preOrders)
Bot.onText(/📃 Custom-Drop Orders/, telegramController.customOrders)
Bot.onText(/💬 Support/, telegramController.support)
Bot.onText(/💷 Account Balance/, telegramController.accountBalance)
Bot.onText(/🫳 Affiliate/, telegramController.affiliateLink)

Bot.onText(/⚙️ Admin Settings/, telegramController.adminPanel)
Bot.onText(/🔑 Partner Panel/, telegramController.partnerPanel)

Bot.on("callback_query", telegramController.onCallBackQuery)

Bot.on("message", telegramController.onMessage)