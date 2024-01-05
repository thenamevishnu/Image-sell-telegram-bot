import env from "dotenv"
import crypto from "crypto"
import Bot from "../Telegram/Config.mjs"
import { Types } from "mongoose"
import { cartDB } from "../Models/cart.model.mjs"
import { orderDB } from "../Models/orders.model.mjs"
import { productDB } from "../Models/product.model.mjs"
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
                    return await Bot.sendMessage(postData.description, `🕛 (<code>#${postData.orderId}</code>) Waiting for payment...`, {
                        parse_mode: "HTML"
                    }) 
                }
                if (status === "Confirming") {
                    return await Bot.sendMessage(postData.description, `🕛 (<code>#${postData.orderId}</code>) Awaiting blockchain network confirmation.`, {
                        parse_mode: "HTML"
                    })
                }
                if (status === "Paid") {
                    await Bot.sendMessage(postData.description, `✅ (<code>#${postData.orderId}</code>) Payment is confirmed`, {
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
                    const orderId = postData.orderId
                    const image = cart[0].product[0].location?.[0]?.photo
                    const name = cart[0].product[0].name
                    const location = cart[0].product[0].location?.[0]?.url
                    const Qty = cart[0].qty
                    if (!image) {
                        await Bot.sendMessage(postData.description, `<i>✖️ There is no drop available. Contact admin!</i>`, {
                            parse_mode: "HTML"
                        })
                    } else {
                        await Bot.sendPhoto(postData.description, image, {
                            caption: `✅ Order <code>#${orderId}</code>\n📦 ${name}\n🛒 Qty: ${Qty}\n${location}`,
                            parse_mode: "HTML"
                        })
                    }
                    const payment = {
                        amount: postData.amount,
                        currency: postData.currency,
                        orderId: postData.orderId,
                        date: postData.date,
                        trackId: postData.trackId,
                        txID: postData.txID
                    }
                    await orderDB.create({
                        user_id: postData.description,
                        product_id: cart[0].product_id,
                        location: {
                            photo: image,
                            url: location
                        },
                        qty: Qty,
                        payment
                    })
                    await cartDB.deleteOne({ _id: new Types.ObjectId(cartId) })
                    await productDB.updateOne({_id: cart[0].product[0]._id},{$pull: {location:{photo: image, url: location}}})
                }
            }
        } else {
            res.status(400).send({ message: "Invalid HMAC signature" })
        }
    } catch (err) {
        res.status(500).send({message: "internal server error"})
    }
}

export default {
    paymentCallback
}