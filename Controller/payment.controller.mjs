import env from "dotenv"
import crypto from "crypto"
import Bot from "../Telegram/Config.mjs"
env.config()

const paymentCallback = async (req, res) => {
    try {
        const postData = req.body
        const apiSecretKey = process.env.OXAPAY_MERCHANT
        const hmacHeader = req.headers['hmac']
        const calculatedHmac = crypto.createHmac("sha512", apiSecretKey).update(JSON.stringify(postData)).digest("hex")
        if (calculatedHmac === hmacHeader) {
            if (postData.type === "payment") {
                const status = postData.status
                if (status === "Waiting") {
                    return await Bot.sendMessage(postData.description, `🕛 (<code>#${postData.orderId}</code>) Waiting for payment...`) 
                }
                if (status === "Confirming") {
                    return await Bot.sendMessage(postData.description, `🕛 <code>#${postData.orderId}</code>) Awaiting blockchain network confirmation.`)
                }
                if (status === "Paid") {
                    return await Bot.sendMessage(postData.description, `✅ <code>#${postData.orderId}</code>) Payment is confirmed`)
                }
            }
        } else {
            res.status(400).send({ message: "Invalid HMAC signature" })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({message: "internal server error"})
    }
}

export default {
    paymentCallback
}