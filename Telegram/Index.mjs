import axios from "axios";
import telegramController from "../Controller/telegram.controller.mjs";
import { userDB } from "../Models/user.model.mjs";
import Bot from "./Config.mjs";

const maintenance = false

if (maintenance) {
    Bot.on("message", async (msg) => {
        const text = `<i>⚠️ Maintenance Mode\n\nPlease try again later! We will be back soon</i>`
        return await Bot.sendMessage(msg.chat.id, text, {
                parse_mode: "HTML"
        })
    })
}else{
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
}