import env from "dotenv"

env.config()

export const getMainKey = (chat_id) => {
    const key = [
        ["💷 Account Balance"],
        ["⭐ Shop", "🫳 Affiliate", "💫 Custom"],
        ["💬 Support", "🛒 Cart", "📃 Orders"]
    ]
    if (process.env.ADMIN_ID == chat_id) {
        key.push(["⚙️ Admin Settings"])
    }
    return key
}

export const getMainText = () => {
    return `Welcome to ${process.env.BOT_NAME}\n\nPay with crypto and receive a location and photo of a pre-dropped package in your city instantly.\n\nCourtesy of @cocobale network by @skgbale`
}

export const answerCallback = {}
export const answerStore = {}
export const chatCallback = {}