import env from "dotenv"

env.config()

export const getMainKey = (chat_id) => {
    const key = [
        ["⭐ Shop", "📃 Orders"],
        ["💬 Support", "🛒 Cart"]
    ]
    if (process.env.ADMIN_ID == chat_id) {
        key.push(["⚙️ Admin Settings"])
    }
    return key
}

export const getMainText = () => {
    return `Welcome to ${process.env.BOT_NAME}\n\nPay with crypto and receive a location and photo of a pre-dropped package in your city instantly.`
}

export const answerCallback = {}
export const answerStore = {}