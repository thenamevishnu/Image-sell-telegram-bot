import axios from "axios"
import env from "dotenv"

env.config()

export const createPaymentLink = async (user_id, amount, callbackUrl, orderId) => {
    const data = JSON.stringify({
        merchant: process.env.OXAPAY_MERCHANT,
        amount: amount,
        currency: "BTC",
        lifeTime: 30,
        feePaidByPayer: 0,
        underPaidCover: 2.5,
        callbackUrl: callbackUrl,
        description: user_id,
        orderId: orderId,
    })
    const { data: response } = await axios.post(process.env.OXAPAY_REQUEST_API, data)
    return response
}