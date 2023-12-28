import Tg from "node-telegram-bot-api"
import env from "dotenv"

env.config()

const Bot = new Tg(process.env.BOT_TOKEN, {
    polling: true
})

export default Bot