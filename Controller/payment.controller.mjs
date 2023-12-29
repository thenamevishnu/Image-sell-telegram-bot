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
                    console.log(JSON.stringify(postData))
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