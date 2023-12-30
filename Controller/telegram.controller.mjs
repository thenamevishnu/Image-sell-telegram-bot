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
import { orderDB } from "../Models/orders.model.mjs"

env.config()

const start = async (msg) => {
    try {
        const text = `Welcome to ${process.env.BOT_NAME}\n\nPay with crypto and receive a location and photo of a pre-dropped package in your city instantly.`
        const key = [
            ["⭐ Shop", "📃 Orders"],
            ["💬 Support", "🛒 Cart"]
        ]
        if (process.env.ADMIN_ID == msg.chat.id) {
            key.push(["⚙️ Admin Settings"])
        }
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
       
    }
}

const orders = async (msg) => {
    try {
        const orders = await orderDB.aggregate([
            {
                $match: {
                    user_id: msg.chat.id
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
        if (orders.length == 0) {
            const text = `There are nothing in your orders!`
            return Bot.sendMessage(msg.chat.id, text, {
                parse_mode: "HTML"
            })
        }
        const text = `📦 Your orders: ${orders.length} items`
        const key = orders.map(item => {
            return [{text: `${item.product[0].name} x ${item.qty}`, callback_data: `/view_order ${item._id}`}]
        })
        return Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        
    }
}

const support = async (msg) => {
    try {
        const text = "<code>💬 Feel free to share your question in a single message.\n\nsend </code><code>/cancel</code><code> to cancel</code>"
        await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML"
        })
        Bot.once("message", async (message) => {
            if (message.text == "/cancel") {
                return Bot.sendMessage(message.chat.id, "<i>✖️ Cancelled</i>", {
                    parse_mode: "HTML"
                })
            }
            const admin = process.env.ADMIN_ID
            const message_id = message.message_id
            await Bot.copyMessage(admin, message.chat.id, message_id, {
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
            const key = [
                [{text: `Reply to ${message.chat.username ? `@${message.chat.username}` : `${message.chat.first_name}`}`, callback_data:`/replyto ${message.chat.id}`}]
            ]
            const text = `<b>🆘 Support Message\n\n👤 Name: ${message.chat.username ? `@${message.chat.username}` : `<a href='tg://user?id=${message.chat.id}'>${message.chat.first_name}</a>`}</b>`
            return await Bot.sendMessage(admin, text, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        })
    } catch (err) {
        
    }
}

const adminPanel = async (msg) => {
    try {
        const chat_id = msg.chat.id
        if (process.env.ADMIN_ID != chat_id) {
            return
        }
        const products = await productDB.find({})
        const key = [
            [
                { text: "➕ Add Country", callback_data: "/admin_add country" },
                { text: "➕ Add City", callback_data: "/admin_add city" }
            ], [
                { text: "➕ Add Product", callback_data: "/admin_add product" }
            ], [
                {text: "👇 product List 👇", callback_data: "0"}
            ]
        ]
        if (products.length > 0) {
            const keys = products.map(item => {
                const items =  [
                    {
                        text: `${item.weight}Kg ${item.name} - ${item.price} ${item.currency}`, callback_data: '0'
                    },
                    {
                        text: `${item.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${item._id} ${!item.active}`
                    }
                ]
                key.push(items)
                return true
            })
        }
        const text = "Admin Panel"
        return Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err);
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
            const product = await productDB.findOne({ _id: product_id })
            if (!product.active) {
                return Bot.answerCallbackQuery(callback.id, "✖️ Product is not available!")
            }
            const text = `🏙️ ${product.city}\n◾◾◾◾◾\n📦 ${product.weight}Kg ${product.name}\n💵 ${product.price} ${product.currency}\nℹ️ No description`
            const key = [[
                {
                    text:"➕ Add to cart", callback_data: `/addtocart ${product_id} 1`
                }
            ]]
            await Bot.deleteMessage(chat_id, message_id)
            return await Bot.sendPhoto(chat_id, product.product_image, {
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
            const resData = await axios.get('https://min-api.cryptocompare.com/data/price', {
                params: {
                    fsym: 'BTC',
                    tsyms: 'EUR',
                },
            });
            const rate = resData.data.EUR
            const rateInBTC = total / rate
            const orderId = Math.floor(new Date().getTime() / 1000)
            const cartId = cart[0]._id
            const response = await createPaymentLink(chat_id, rateInBTC, `${process.env.SERVER}/payment/callback/${cartId}`, orderId)
            if (response.result == 100 && response.message == "success") {
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

        if (command === "/view_order") {
            const orderId = array[0]
            const order = await orderDB.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(orderId)
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
            if (order.length==0) {
                const text = `Can't find your order`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const orderInfo = order[0]
            const text = `<b>📦 ${orderInfo.product[0].weight}Kg ${orderInfo.product[0].name}\n🌍 Location: ${orderInfo.product[0].location}\n🛒 Qty: <code>${orderInfo.qty}</code>\n💵 Total Amount: <code>${orderInfo.payment.amount} ${orderInfo.payment.currency}</code>\n📃 OrderId: <code>#${orderInfo.payment.orderId}</code>\n#️⃣ txID: <code>${orderInfo.payment.txID}</code>\n\nDate: <code>${new Date(orderInfo.payment.date * 1000).toUTCString()}</code></b>`
            await Bot.deleteMessage(chat_id, message_id)
            return Bot.sendPhoto(chat_id, orderInfo.product[0].location_image, {
                caption: text,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        }

        if (command === "/replyto") {
            const user_id = array[0]
            const text = `💬 Send reply in single message or <code>/cancel</code>`
            await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
            Bot.once("message", async (message) => {
                if (message.text == "/cancel") {
                    return Bot.sendMessage(message.chat.id, "<i>✖️ Cancelled</i>", {
                        parse_mode: "HTML"
                    })
                }
                await Bot.copyMessage(user_id, message.chat.id, message.message_id, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
                return Bot.sendMessage(message.chat.id, "✅ Message sent!")
            })
        }

        if (command === "/admin_add") {
            const type = array[0]
            if (type == "country") {
                const text = `Enter country name (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)\n\n<code>/cancel</code> to cancel`
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    msg.text.split(",").forEach(async item => {
                        await countryDB.create({name: item})
                    })
                    const text = `✅ Countries added`
                    return Bot.sendMessage(msg.chat.id, text, {
                        parse_mode: "HTML"
                    })
                })
            }

            if (type == "city") {
                const text = `Select country to add cities!`
                const countries = await countryDB.find({})
                const key = countries.map(item => {
                    return [{text: item.name, callback_data: `/add_city_to ${item.name}`}]
                })
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            }

            if (type == "product") {
                const text = `Select city to add products!`
                const cities = await cityDB.find({})
                const key = cities.map(item => {
                    return [{text: `${item.name} (${item.country})`, callback_data: `/add_product_to ${item._id}`}]
                })
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            }
        }

        if (command === "/add_city_to") {
            const country = array[0]
            const text = `Enter city name to add in ${country} (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)\n\n<code>/cancel</code> to cancel`
            await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
            Bot.once("message", async (msg) => {
                if (msg.text == "/cancel") {
                    return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                        parse_mode: "HTML"
                    })
                }
                msg.text.split(",").forEach(async item => {
                    await cityDB.create({name: item, country: country})
                })
                const text = `✅ Cities added`
                return Bot.sendMessage(msg.chat.id, text, {
                    parse_mode: "HTML"
                })
            })
        }

        if (command === "/add_product_to") {
            const productInfo = {}
            const cityId = array[0]
            const city = await cityDB.findOne({_id: cityId})
            const text = `Adding product to {country: ${city.country}, city: ${city.name}}\n\nPlease enter the name of product!\n\n<code>/cancel</code> to cancel`
            await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
            Bot.once("message", async (msg) => {
                if (msg.text == "/cancel") {
                    return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                        parse_mode: "HTML"
                    })
                }
                productInfo.name = msg.text
                await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nEnter the weight in digits only (in Kg)\n\n<code>/cancel</code> to cancel`, {
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    productInfo.weight = parseFloat(msg.text)
                    await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nEnter price in digit only\n\n<code>/cancel</code> to cancel`, {
                        parse_mode: "HTML"
                    })
                    Bot.once("message", async (msg) => {
                        if (msg.text == "/cancel") {
                            return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                                parse_mode: "HTML"
                            })
                        }
                        productInfo.price = parseFloat(msg.text)
                        await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nSend product photo only`, {
                            parse_mode: "HTML"
                        })
                        Bot.once("message", async (msg) => {
                            if (msg.text == "/cancel") {
                                return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                                    parse_mode: "HTML"
                                })
                            }
                            productInfo.product_image = msg.photo[0].file_id
                            await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nSend location photo only`, {
                                parse_mode: "HTML"
                            })
                            Bot.once("message", async (msg) => {
                                if (msg.text == "/cancel") {
                                    return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                                        parse_mode: "HTML"
                                    })
                                }
                                productInfo.location_image = msg.photo[0].file_id
                                await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nEnter location url`, {
                                    parse_mode: "HTML"
                                })
                                Bot.once("message", async (msg) => {
                                    if (msg.text == "/cancel") {
                                        return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                                            parse_mode: "HTML"
                                        })
                                    }
                                    productInfo.location = msg.text
                                    const findDoc = await productDB.findOne().sort({_id: -1})
                                    await productDB.create({ _id: findDoc ? findDoc._id + 1 : 1, product_image: productInfo.product_image, location_image: productInfo.location_image, city: city.name, currency: "euro", weight: productInfo.weight, price: productInfo.price, name: productInfo.name, location: productInfo.location})
                                    await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\n✅ Product saved`, {
                                        parse_mode: "HTML",
                                        disable_web_page_preview: true
                                    })
                                })
                            })
                        })
                    })
                })
            })
        }

        if (command === "/status_change") {
            const product_id = array[0]
            const status = array[1]
            await productDB.updateOne({ _id: product_id }, { $set: { active: status } })
            const products = await productDB.find({})
            const key = [
                [
                    { text: "➕ Add Country", callback_data: "/admin_add country" },
                    { text: "➕ Add City", callback_data: "/admin_add city" }
                ], [
                    { text: "➕ Add Product", callback_data: "/admin_add product" }
                ], [
                    {text: "👇 product List 👇", callback_data: "0"}
                ]
            ]
            if (products.length > 0) {
                const keys = products.map(item => {
                    const items =  [
                        {
                            text: `${item.weight}Kg ${item.name} - ${item.price} ${item.currency}`, callback_data: '0'
                        },
                        {
                            text: `${item.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${item._id} ${!item.active}`
                        }
                    ]
                    key.push(items)
                    return true
                })
            }
            return Bot.editMessageReplyMarkup({
                inline_keyboard: key
            }, {
                chat_id: chat_id,
                message_id: message_id
            })
        }

    } catch (err) {
       
    }

}

export default {
    start,
    shop,
    cart,
    orders,
    support,
    adminPanel,
    onCallBackQuery
}