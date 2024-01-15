import env from "dotenv"
import crypto from "crypto"
import Bot from "../Telegram/Config.mjs"
import { Types } from "mongoose"
import { cartDB } from "../Models/cart.model.mjs"
import { orderDB } from "../Models/orders.model.mjs"
import { productDB } from "../Models/product.model.mjs"
import { soldDB } from "../Models/sold.model.mjs"
import { payoutDB } from "../Models/payout.model.mjs"
import { userDB } from "../Models/user.model.mjs"

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
                const ordersList = await orderDB.findOne({"payment.trackId": parseInt(postData.trackId)})
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
                if (status === "Paid" && !ordersList) {
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
                        const userinfo = await Bot.getChat(postData.description)
                        const inviter = await userDB.findOne({ _id: userinfo.id })
                        const InvitedBy = inviter.inviter
                        if (InvitedBy && InvitedBy != 0) {
                            const commission = parseFloat(postData.amount) * 0.1
                            await userDB.updateOne({ _id: InvitedBy }, { $inc: { balance: commission } })
                            await Bot.sendMessage(InvitedBy, `<i>💷 Referral Income: +${commission} ${postData.currency}</i>`)
                        }
                        const uname = userinfo.username ? `@${userinfo.username}` : `<a href='tg://user?id=${userinfo.id}'>${userinfo.first_name}</a>`
                        await Bot.sendPhoto(process.env.ADMIN_ID, image, {
                            caption: `✅ Sold to ${uname}\n📦 ${name}\n🛒 Qty: ${Qty}\n${location}`,
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
                    await soldDB.create({
                        user_id: postData.description,
                        neighbourhood: cart[0].product[0].neighbourhood,
                        name: cart[0].product[0].name,
                        currency: cart[0].product[0].currency,
                        price: cart[0].product[0].price,
                        product_image: cart[0].product[0].product_image,
                        qty: Qty,
                        location: {
                            photo: image,
                            url: location
                        }
                    })
                    await productDB.updateOne({ _id: cart[0].product[0]._id }, { $pull: { location: { photo: image, url: location } } })
                    const products = await productDB.findOne({ _id: cart[0].product[0]._id })
                    if (products.location.length <= 0) {
                        await productDB.updateOne({ _id: cart[0].product[0]._id }, { $set: {active: false} })
                    }
                }
            }
        } else {
            res.status(400).send({ message: "Invalid HMAC signature" })
        }
    } catch (err) {
        res.status(500).send({message: "internal server error"})
    }
}

const payoutCallback = async (req, res) => {
    try {
        const postData = req.body
        const apiSecretKey = process.env.OXAPAY_PAYOUT
        const hmacHeader = req.headers['hmac']
        const calculatedHmac = crypto.createHmac("sha512", apiSecretKey).update(JSON.stringify(postData)).digest("hex")
        if (calculatedHmac === hmacHeader) {
            if (postData.type === "payout") {
                const status = postData.status
                const paid = await payoutDB.findOne({trackId: parseInt(postData.trackId)})
                if (status === "Confirming") {
                    return await Bot.sendMessage(postData.description, `🕛 Your payout request sent and awaiting blockchain network confirmation.`, {
                        parse_mode: "HTML"
                    })
                }
                if (status === "Complete" && !paid) {
                    await Bot.sendMessage(postData.description, `✅ Payout sent\n\n💰 ${postData.amount} ${postData.currency} sent to ${postData.address}\n\n🛰️ TxID: ${postData.txID}`, {
                        parse_mode: "HTML"
                    })
                    
                    const payment = {
                        user_id: parseInt(postData.description),
                        amount: postData.amount,
                        currency: postData.currency,
                        address: postData.address,
                        date: postData.date,
                        trackId: postData.trackId,
                        txID: postData.txID
                    }
                    
                    await payoutDB.create(payment)

                    const userinfo = await Bot.getChat(postData.description)
                    const uname = userinfo.username ? `@${userinfo.username}` : `<a href='tg://user?id=${userinfo.id}'>${userinfo.first_name}</a>`

                    await Bot.sendMessage(postData.description, `✅ Payout sent to ${uname}\n\n💰 ${postData.amount} ${postData.currency} sent to ${postData.address}\n\n🛰️ TxID: ${postData.txID}`, {
                        parse_mode: "HTML"
                    })
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
    paymentCallback,
    payoutCallback
}