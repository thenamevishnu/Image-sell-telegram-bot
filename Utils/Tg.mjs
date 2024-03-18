import env from "dotenv"
import { partnersDB } from "../Models/partners.model.mjs"

env.config()

export const getMainKey = async (chat_id) => {
    const partner = await partnersDB.findOne({ _id: chat_id })
    const key = [
        ["💷 Account Balance"],
        ["⭐ Shop", "🫳 Affiliate", "💫 Custom"],
        ["💬 Support", "🛒 Cart", "📃 Orders"]
    ]
    if (process.env.ADMIN_ID == chat_id) {
        if (partner) {
            key.push(["⚙️ Admin Settings", "🔑 Partner Panel"])   
        } else {
            key.push(["⚙️ Admin Settings"])
        }
    } else {
        if (partner) {
            key.push(["🔑 Partner Panel"])   
        }
    }

    return key
}

export const getMainText = () => {
    return `👾 Welcome to Balenciaga 24/7 Shop.\n\nPay with crypto and receive a location and photo of a pre-dropped package in your city instantly.\n\nCourtesy of @cocobale network by @skgbale`
}

export const answerCallback = {}
export const answerStore = {}
export const chatCallback = {}