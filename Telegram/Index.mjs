import telegramController from "../Controller/telegram.controller.mjs";
import Bot from "./Config.mjs";

Bot.onText(/\/start/, telegramController.start)
Bot.onText(/⭐ Shop/, telegramController.shop)
Bot.onText(/🛒 Cart/, telegramController.cart)

Bot.on("callback_query", telegramController.onCallBackQuery)