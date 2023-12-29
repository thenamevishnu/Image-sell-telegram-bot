import env from "dotenv"
import crypto from "crypto"
import Bot from "../Telegram/Config.mjs"
import { Types } from "mongoose"
import { cartDB } from "../Models/cart.model.mjs"
env.config()

const paymentCallback = async (req, res) => {
    try {
        const postData = req.body
        const { cartId } = req.params
        const apiSecretKey = process.env.OXAPAY_MERCHANT
        const hmacHeader = req.headers['hmac']
        const calculatedHmac = crypto.createHmac("sha512", apiSecretKey).update(JSON.stringify(postData)).digest("hex")
        if (calculatedHmac === hmacHeader) {
            if (postData.type === "payment") {
                const status = postData.status
                if (status === "Waiting") {
                    const cart = await cartDB.aggregate([
                        {
                            $match: {
                                _id: new Types.ObjectId(cartId)
                            }
                        }, {
                            $lookup: {
                                from: "products",
                                localField: "product_id",
                                foreignField: "_id",
                                as: "product"
                            }
                        }
                    ])
                    console.log(cart);
                    return await Bot.sendMessage(postData.description, `🕛 (<code>#${postData.orderId}</code>) ${cartId} Waiting for payment...`, {
                        parse_mode: "HTML"
                    }) 
                }
                if (status === "Confirming") {
                    return await Bot.sendMessage(postData.description, `🕛 <code>#${postData.orderId}</code>) Awaiting blockchain network confirmation.`, {
                        parse_mode: "HTML"
                    })
                }
                if (status === "Paid") {
                    await Bot.sendMessage(postData.description, `✅ <code>#${postData.orderId}</code>) Payment is confirmed`, {
                        parse_mode: "HTML"
                    })
                    const cart = await cartDB.aggregate([
                        {
                            $match: {
                                _id: new Types.ObjectId(cartId)
                            }
                        }, {
                            $lookup: {
                                from: "products",
                                localField: "product_id",
                                foreignField: "_id",
                                as: "product"
                            }
                        }
                    ])
                    console.log(cart);
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