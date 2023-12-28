import env from "dotenv"
import Bot from "../Telegram/Config.mjs"
import { countryDB } from "../Models/country.model.mjs"
import { cityDB } from "../Models/city.model.mjs"
import { productDB } from "../Models/product.model.mjs"
import axios from "axios"
import { cartDB } from "../Models/cart.model.mjs"
import { Types } from "mongoose"
import { createPaymentLink } from "../Utils/oxapay.mjs"
import { userDB } from "../Models/user.model.mjs"

env.config()

const start = async (msg) => {
    try {
        const text = `Welcome to ${process.env.BOT_NAME}\n\nPay with crypto and receive a location and photo of a pre-dropped package in your city instantly.`
        const key = [
            ["⭐ Shop", "📃 Orders"],
            ["💬 Support", "🛒 Cart"]
        ]
        const user = await userDB.findOne({ _id: msg.chat.id })
        if (!user) {
            await userDB.create({_id: msg.chat.id, first_name: msg.chat.first_name, username: msg.chat.username})
        }
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: key,
                resize_keyboard: true
            }
        })
    } catch(err) {
        console.log(err.message)
    }
}

const shop = async (msg) => {
    try {
        const countries = await countryDB.find({})
        const key = countries.map(item => {
            return [{text: item.name, callback_data: `/select_country ${item.name}`}]
        })
        const text = `🌍 Select a country`
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message)
    }
}

const cart = async (msg) => {
    try {
        const chat_id = msg.chat.id
        const cart = await cartDB.aggregate([
            {
                $match: {
                    user_id: chat_id
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
        if (cart.length == 0) {
            const text = `<code>🛒 Your cart is empty</code>`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }
        const text = `🛒 Your cart: ${cart.length} items`
        const key = cart.map(item => {
            return [{text: `${item.product[0].name} (Qty: ${item.qty})`, callback_data: `/view ${item.product_id}`},{text: "❌", callback_data: `/remove_cart ${item.product_id}`}]
        })
        return await Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err)
    }
}

const onCallBackQuery = async (callback) => {
    try {
        const query = callback.data
        const message_id = callback.message.message_id
        const chat_id = callback.from.id
        const command = query.split(" ")[0]
        const array = query.split(" ")
        array.shift()

        if (command === "/select_country") {
            const country = array[0]
            const text = `🏙️ Select a city`
            const cities = await cityDB.find({country: country})
            const key = cities.map(item => {
                return [{text: item.name, callback_data: `/select_city ${item.name}`}]
            })
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/select_city") {
            const city = array[0]
            const text = `🏙️ ${city}\n◾◾◾◾◾\nSelect a product`
            const products = await productDB.find({city: city})
            const key = products.map(item => {
                return [{text: `${item.active ? `✅` : `❌`} ${item.weight}Kg ${item.name} 💵 ${item.price} ${item.currency}`, callback_data: `/select_product ${item._id}`}]
            })
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/select_product") {
            const product_id = array[0]
            const product = await productDB.findOne({_id: product_id})
            const text = `🏙️ ${product.city}\n◾◾◾◾◾\n📦 ${product.weight}Kg ${product.name}\n💵 ${product.price} ${product.currency}\nℹ️ No description`
            const key = [[
                {
                    text:"➕ Add to cart", callback_data: `/addtocart ${product_id} 1`
                }
            ]]
            await Bot.deleteMessage(chat_id, message_id)
            return await Bot.sendPhoto(chat_id, product.image, {
                caption: text,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/addtocart") {
            const product_id = array[0]
            const qty = parseInt(array[1])
            let key = null
            if (qty == 0) {
                key = [
                    [{text:"➕ Add to cart", callback_data: `/addtocart ${product_id} 1`}]
                ]
            } else {
                key = [[
                    {text: "➖", callback_data: `/addtocart ${product_id} ${qty - 1}`},
                    {text:`🛒 ${qty}`, callback_data: "0"},
                    {text: "➕", callback_data: `/addtocart ${product_id} ${qty + 1}`}
                ]]
            }
            const user_id = chat_id
            await axios.post(`${process.env.SERVER}/cart/create`, { product_id, user_id, qty })
            return await Bot.editMessageReplyMarkup({
                inline_keyboard: key
            }, {
                chat_id: chat_id,
                message_id: message_id
            })
        }

        if (command === "/remove_cart") {
            const product_id = array[0]
            await axios.delete(`${process.env.SERVER}/cart/delete/${product_id}/${chat_id}`)
            const cart = await cartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id
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
            if (cart.length == 0) {
                const text = `<code>🛒 Your cart is empty</code>`
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
            }
            const text = `🛒 Your cart: ${cart.length} items`
            const key = cart.map(item => {
                return [{text: `${item.product[0].name} (Qty: ${item.qty})`, callback_data: `/view ${item.product_id}`},{text: "❌", callback_data: `/remove_cart ${item.product_id}`}]
            })
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/view") {
            const product_id = parseInt(array[0])
            const cart = await cartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id,
                        product_id: product_id
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
            const key = [
                [{text: "📃 Create Order", callback_data: `/create_order ${product_id}`}]
            ]
            const text = `<b>📦 ${cart[0].product[0].weight}Kg ${cart[0].product[0].name} (${cart[0].qty}) * ${cart[0].product[0].price} = 💵 ${cart[0].product[0].price * cart[0].qty}\n◾◾◾◾◾◾◾◾◾◾\nTotal: ${cart[0].product[0].price * cart[0].qty} ${cart[0].product[0].currency}</b>`
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/create_order") {
            const product_id = parseInt(array[0])
            const cart = await cartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id,
                        product_id: product_id
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
            const total = cart[0].product[0].price * cart[0].qty
            const resData = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'bitcoin',
                    vs_currencies: 'eur',
                },
            });
            const rate = resData.data.bitcoin.eur
            const rateInBTC = total / rate
            const orderId = Math.floor(new Date().getTime()/1000)
            const response = await createPaymentLink(chat_id, rateInBTC, `${process.env.SERVER}/payment/callback`, orderId)
            if (response.result == 100 && response.message == "success") {
                const trackId = response.trackId
                const text = `<b>📃 Your order <code>#${orderId}</code> is created:\nTotal: 💵 ${total} ${cart[0].product[0].currency}</b>`
                const key = [
                    [{text: "Pay with crypto", url: response.payLink}]
                ]
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.sendMessage(chat_id, "Error happend")
            }
        }

    } catch (err) {
        console.log(err)
    }

}

export default {
    start,
    shop,
    cart,
    onCallBackQuery
}