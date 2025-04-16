import axios from "axios"
import env from "dotenv"

env.config()

export const createPaymentLink = async (user_id, amount, callbackUrl, orderId) => {
    try {
        const data = {
            amount: amount,
            currency: "BTC",
            lifetime: 1440,
            fee_paid_by_payer: 0,
            under_paid_coverage: 2.5,
            callback_url: callbackUrl,
            order_id: `${orderId}`,
            thanks_message: "Thank you for your order",
            description: `${user_id}`,
            sandbox: false
        };
    
        const headers = {
            "merchant_api_key": process.env.OXAPAY_MERCHANT,
            "Content-Type": "application/json",
        };
        const { data: response } = await axios.post(process.env.OXAPAY_REQUEST_API, data, {headers})
        return response
    } catch (err) {
        return null
    }
}

export const createPayout = async (user_id, receiver_crypto_address, amount, callbackUrl) => {
        
    try{
        const body = {
            address: `${receiver_crypto_address}`,
            amount: amount,
            currency: "USDT",
            network: "TRC20",
            callbackUrl: callbackUrl,
            description: `${user_id}`
        }
    
        const headers = {
            "payout_api_key": process.env.OXAPAY_PAYOUT,
            "Content-Type": "application/json"
        }
    
        const { data: response } = await axios.post(process.env.OXAPAY_PAYOUT_API, body, {headers})
        console.log(response);
        return response
    } catch (err) {
        return {err: "There was an error occured. Please try again."}
    }
}