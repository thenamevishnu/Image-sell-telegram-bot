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
import { neighbourhoodDB } from "../Models/neighbourhood.model.mjs"
import cronJob from "node-cron"
import { soldDB } from "../Models/sold.model.mjs"

env.config()

const callbackAnswer = {}
let bcast_sent = {}

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
            return [{text: item.name, callback_data: `/select_country | ${item.name}`}]
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
            return [{ text: `${item.product[0].name} (Qty: ${item.qty})`, callback_data: `0` }, {text: "Checkout 🎯", callback_data: `/view ${item.product_id}`}, {text: "❌", callback_data: `/remove_cart ${item.product_id}`}]
        })
        return await Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
       console.log(err);
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
        const text = "<code>💬 Feel free to share your question in a single message.\n\nsend </code>/cancel<code> to cancel</code>"
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
                {text: "🛰️ Broadcast to users", callback_data: "/broadcast"}
            ],
            [
                { text: "➕ Add Country", callback_data: "/admin_add country" },
                { text: "➕ Add Product", callback_data: "/admin_add product" },
                { text: "➕ Add City", callback_data: "/admin_add city" }
            ], [
                { text: "➕ Add Neighbourhood", callback_data: "/admin_add neighbour" }  
            ], [
                { text: "📃 Neighbourhood List", callback_data: "/admin_list neighbour" }  
            ],
            [
                { text: "📃 Country List", callback_data: "/admin_list country" },
                { text: "🛰️ Sold products", callback_data: "/sold_products1" },
                { text: "📃 City List", callback_data: "/admin_list city" }
            ],
            [
                {text: "👇 product List 👇", callback_data: "0"}
            ]
        ]
        if (products.length > 0) {
            const keys = products.map(item => {
                const items =  [
                    {
                        text: `${item.name} - ${item.price} ${item.currency}`, callback_data: `/admin_products ${item._id}`
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
        const params = query.split(" | ")
        params.shift()

        if (!callbackAnswer[chat_id]) {
            callbackAnswer[chat_id] = {}
        }

        if (query === "/shop") {
            const countries = await countryDB.find({})
            const key = countries.map(item => {
                return [{text: item.name, callback_data: `/select_country | ${item.name}`}]
            })
            const text = `🌍 Select a country`
            callbackAnswer[chat_id] = {}
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/select_country") {
            const country = params[0]
            const text = `🏙️ Select a city`
            const cities = await cityDB.find({country: country})
            const key = cities.map(item => {
                return [{text: item.name, callback_data: `/select_city | ${item.name}`}]
            })
            key.push([{ text: "🔙 Back", callback_data: "/shop" }])
            callbackAnswer[chat_id].country = country
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
            const city = params[0]
            const text = `🏙️ ${city}\n◾◾◾◾◾\nSelect a neighbourhood`
            const neighbourhood = await neighbourhoodDB.find({city: city})
            const key = neighbourhood.map(item => {
                return [{text: `${item.name}`, callback_data: `/select_neighbour | ${item.name}`}]
            })
            const country = callbackAnswer[chat_id].country
            key.push([{ text: "🔙 Back", callback_data: `/select_country | ${country}` }])
            callbackAnswer[chat_id].city = city
            console.log(callbackAnswer[chat_id]);
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/select_neighbour") {
            const neighbour = params[0]
            const text = `🏙️ ${neighbour}\n◾◾◾◾◾\nSelect a product`
            const products = await productDB.find({neighbourhood: neighbour})
            const key = products.map(item => {
                return [{text: `${item.active ? `✅` : `❌`} ${item.name} 💵 ${item.price} ${item.currency}`, callback_data: `/select_product ${item._id}`}]
            })
            const city = callbackAnswer[chat_id].city
            key.push([{ text: "🔙 Back", callback_data: `/select_city | ${city}` }])
            callbackAnswer[chat_id].neighbour = neighbour
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
            const text = `🏙️ ${product.neighbourhood}\n◾◾◾◾◾\n📦 ${product.name}\n💵 ${product.price} ${product.currency}\nℹ️ No description`
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
            const text = `<b>📦 ${cart[0].product[0].name} (${cart[0].qty}) * ${cart[0].product[0].price} = 💵 ${cart[0].product[0].price * cart[0].qty}\n◾◾◾◾◾◾◾◾◾◾\nTotal: ${cart[0].product[0].price * cart[0].qty} ${cart[0].product[0].currency}</b>`
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
            if (cart[0].product[0].location.length<=0) {
                return await Bot.answerCallbackQuery(callback.id, "❌ No Drop were found in this product")
            }
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
            const text = `<b>📦 ${orderInfo.product[0].name}\n🌍 Location: ${orderInfo.location.url}\n🛒 Qty: <code>${orderInfo.qty}</code>\n💵 Total Amount: <code>${orderInfo.payment.amount} ${orderInfo.payment.currency}</code>\n📃 OrderId: <code>#${orderInfo.payment.orderId}</code>\n#️⃣ txID: <code>${orderInfo.payment.txID}</code>\n\nDate: <code>${new Date(orderInfo.payment.date * 1000).toUTCString()}</code></b>`
            await Bot.deleteMessage(chat_id, message_id)
            return Bot.sendPhoto(chat_id, orderInfo.location.photo, {
                caption: text,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        }

        if (command === "/replyto") {
            const user_id = array[0]
            const text = `💬 Send reply in single message or /cancel`
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
                const text = `Enter country name (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)\n\n/cancel to cancel`
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
                    return [{text: item.name, callback_data: `/add_city_to | ${item.name}`}]
                })
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            }

            if (type == "neighbour") {
                const text = `Select city to add neighbourhood!`
                const cities = await cityDB.find({})
                const key = cities.map(item => {
                    return [{text: item.name, callback_data: `/add_neighbour_to | ${item.name}`}]
                })
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            }

            if (type == "product") {
                const text = `Select neighbourhood to add products!`
                const neighbour = await neighbourhoodDB.find({})
                const key = neighbour.map(item => {
                    return [{text: `${item.name} (${item.city})`, callback_data: `/add_product_to | ${item._id}`}]
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
            const country = params[0]
            const text = `Enter city name to add in ${country} (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)\n\n/cancel to cancel`
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

        if (command === "/add_neighbour_to") {
            const city = params[0]
            const text = `Enter neighbour name to add in ${city} (Eg: city1) or seperate by commas (Eg: city1,city2,other,...)\n\n/cancel to cancel`
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
                    await neighbourhoodDB.create({name: item, city: city})
                })
                const text = `✅ Neighbourhoods added`
                return Bot.sendMessage(msg.chat.id, text, {
                    parse_mode: "HTML"
                })
            })
        }

        if (command === "/add_product_to") {
            const productInfo = {}
            const neighbourId = params[0]
            const neighbour = await neighbourhoodDB.findOne({_id: neighbourId})
            const text = `Adding product to {City: ${neighbour.city}}\n\nEnter your product name\n\n/cancel to cancel`
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
                await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nEnter price in digits (EUR) (Eg: 5)\n\n/cancel to cancel`, {
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    productInfo.price = parseFloat(msg.text)
                    await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\nSend product Image`, {
                        parse_mode: "HTML"
                    })
                    Bot.once("message", async (msg) => {
                        if (msg.text == "/cancel") {
                            return Bot.sendMessage(msg.chat.id, "<i>✖️ Cancelled</i>", {
                                parse_mode: "HTML"
                            })
                        }
                        productInfo.product_image = msg.photo[0].file_id
                        const findDoc = await productDB.findOne().sort({_id: -1})
                        await productDB.create({ _id: findDoc ? findDoc._id + 1 : 1, product_image: productInfo.product_image, neighbourhood: neighbour.name, currency: "euro", price: productInfo.price, name: productInfo.name})
                        await Bot.sendMessage(chat_id, `${JSON.stringify(productInfo)}\n\n✅ Product saved`, {
                            parse_mode: "HTML",
                            disable_web_page_preview: true
                        })
                    })
                })
            })
        }

        if (command === "/status_change") {
            const product_id = parseInt(array[0])
            const status = array[1]
            await productDB.updateOne({ _id: product_id }, { $set: { active: status } })
            const product = await productDB.findOne({_id: product_id})
            const key = [
                [{ text: `${product.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${product_id} ${!product.active}` }, { text: `❌ Delete`, callback_data: `/deleteProduct ${product_id}` }],
                [{ text: "View Product Image", callback_data: `/admin_view_pimage ${product_id}`},{text: "View Drop", callback_data: `/admin_view_drop ${product_id}`}],
                [{ text: `🖊️ Edit Name`, callback_data: `/admin_change Name ${product_id}` }, { text: `🖊️ Edit Image`, callback_data: `/admin_change Pimage ${product_id}` }, { text: `🖊️ Edit Price`, callback_data: `/admin_change Price ${product_id}` }],
                [{ text: "🖊️ Add/Change Drop", callback_data: `/admin_change Drop ${product_id}`}]
            ]
            return Bot.editMessageReplyMarkup({
                inline_keyboard: key
            }, {
                chat_id: chat_id,
                message_id: message_id
            })
        }

        if(command === "/admin_list"){
            const type = array[0]
            if (type == "country") {
                const text = `📃 List of available county`
                const countries = await countryDB.find()
                const key = countries.map(item => {
                    return [{text: item.name, callback_data: "0"},{text: "❌ Delete", callback_data: `/admin_delete country ${item._id}`}]
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

            if (type == "city") {
                const text = `📃 List of available city`
                const cities = await cityDB.find()
                const key = cities.map(item => {
                    return [{text: item.name, callback_data: "0"},{text: "❌ Delete", callback_data: `/admin_delete city ${item._id}`}]
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

            if (type == "neighbour") {
                const text = `📃 List of available neighbourboods`
                const neighbour = await neighbourhoodDB.find()
                const key = neighbour.map(item => {
                    return [{text: item.name, callback_data: "0"},{text: "❌ Delete", callback_data: `/admin_delete neighbour ${item._id}`}]
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
        }

        if (command === "/admin_delete") {
            const id = array[1]
            const type = array[0]
            if (type == "city") {
                const text = `✅ City deleted`
                await cityDB.deleteOne({_id: new Types.ObjectId(id)})
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
            }
            if (type == "country") {
                const text = `✅ City deleted`
                await countryDB.deleteOne({_id: new Types.ObjectId(id)})
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
            }

            if (type == "country") {
                const text = `✅ Neighbourhood deleted`
                await neighbourhoodDB.deleteOne({_id: new Types.ObjectId(id)})
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
            }
        }

        if (command === "/admin_products") {
            const product_id = parseInt(array[0])
            const product = await productDB.findOne({_id: product_id})
            const text = `<b>Title: ${product.name}\nPrice: ${product.price} ${product.currency}\n</b>`
            const key = [
                [{ text: `${product.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${product_id} ${!product.active}` }, { text: `❌ Delete`, callback_data: `/deleteProduct ${product_id}` }],
                [{ text: "View Product Image", callback_data: `/admin_view_pimage ${product_id}`},{text: "View Drop", callback_data: `/admin_view_drop ${product_id}`}],
                [{ text: `🖊️ Edit Name`, callback_data: `/admin_change Name ${product_id}` }, { text: `🖊️ Edit Image`, callback_data: `/admin_change Pimage ${product_id}` }, { text: `🖊️ Edit Price`, callback_data: `/admin_change Price ${product_id}` }],
                [{ text: "🖊️ Add/Change Drop", callback_data: `/admin_change Drop ${product_id}`}]
            ]
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/admin_change") {
            const type = array[0]
            const pid = parseInt(array[1])
            if (type == "Name") {
                const text = `🖊️ Enter the title of your product!\n\n/cancel to cancel`
                await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return await Bot.sendMessage(chat_id, "<i>✖️ Cancelled!</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    await productDB.updateOne({ _id: pid }, { $set: { name: msg.text } })
                    return await Bot.sendMessage(chat_id, "✅ Name updated")
                })
            }
            if (type == "Price") {
                const text = `🖊️ Enter the price in digits (EUR) (Eg: 5)!\n\n/cancel to cancel`
                await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return await Bot.sendMessage(chat_id, "<i>✖️ Cancelled!</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    await productDB.updateOne({ _id: pid }, { $set: { price: parseFloat(msg.text) } })
                    return await Bot.sendMessage(chat_id, "✅ Price updated")
                })
            }
            if (type == "Pimage") {
                const text = `🖊️ Send product image!\n\n/cancel to cancel`
                await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return await Bot.sendMessage(chat_id, "<i>✖️ Cancelled!</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    const img = msg.photo[0].file_id
                    await productDB.updateOne({ _id: pid }, { $set: { product_image: img } })
                    return await Bot.sendMessage(chat_id, "✅ Product image updated")
                })
            }
            if (type == "Drop") {
                const text = `🖊️ Send Drop image and location url in caption!\n\n/cancel to cancel`
                await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    parse_mode: "HTML"
                })
                Bot.once("message", async (msg) => {
                    if (msg.text == "/cancel") {
                        return await Bot.sendMessage(chat_id, "<i>✖️ Cancelled!</i>", {
                            parse_mode: "HTML"
                        })
                    }
                    const img = msg.photo?.[0]?.file_id
                    if (msg.caption) {
                        const obj = {
                            photo: img,
                            url: msg.caption
                        }
                        await productDB.updateOne({ _id: pid }, { $push: { location: obj } })
                        await productDB.updateOne({ _id: pid }, { $set: { active: true } })
                    } else {
                        const key = [
                            [{text: "🔄️ Try again", callback_data: `/admin_change Drop ${pid}`}]
                        ]
                        return await Bot.sendMessage(chat_id, "<i>Add caption to image</i>", {
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: key
                            }
                        })
                    }
                    const key = [
                        [{text: "➕ Add Drop", callback_data: `/admin_change Drop ${pid}`}]
                    ]
                    return await Bot.sendMessage(chat_id, "✅ Drop updated", {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: key
                        }
                    })
                })
            }
        }

        if (command === "/deleteProduct") {
            const pid = parseInt(array[0])
            await productDB.deleteOne({ _id: pid })
            const text = "✅ Product deleted"
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
            })
        }

        if (command === "/admin_view_pimage") {
            const pid = parseInt(array[0])
            const product = await productDB.findOne({ _id: pid })
            const product_image = product.product_image
            if (product_image) {
                const key = [
                    [{text: "🔙 Back", callback_data: `/admin_remove_view`}]
                ]
                return await Bot.sendPhoto(chat_id, product_image, {
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, "❌ No Image exist")
            }
        }

        if (command === "/admin_remove_view") {
            return await Bot.deleteMessage(chat_id, message_id)
        }

        if (command === "/admin_view_drop") {
            const pid = parseInt(array[0])
            const product = await productDB.findOne({ _id: pid })
            const totalPics = product.location.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== 1)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/5); index++){
                    newRows.push(rows.splice(0,5))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/admin_drops_view ${pid} ${items}`
                        }
                    })
                })
                const back = [{ text: "🔙 Back", callback_data: `/admin_remove_view` }]
                const del = [{ text: "❌ Delete", callback_data: `/admin_delete_drop ${pid} 0` }]
                key.push(back)
                key.unshift(del)
                return await Bot.sendPhoto(chat_id, product.location[0].photo, {
                    caption: "1) "+ product.location[0].url || "No Location url",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, "❌ No Image exist")
            }
        }

        if (command === "/admin_drops_view") {
            const pid = parseInt(array[0])
            const viewIndex = parseInt(array[1])
            const product = await productDB.findOne({ _id: pid })
            const totalPics = product.location.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== viewIndex)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/5); index++){
                    newRows.push(rows.splice(0,5))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/admin_drops_view ${pid} ${items}`
                        }
                    })
                })
                const back = [{ text: "🔙 Back", callback_data: `/admin_remove_view` }]
                const del = [{ text: "❌ Delete", callback_data: `/admin_delete_drop ${pid} ${viewIndex - 1}` }]
                key.push(back)
                key.unshift(del)
                return await Bot.editMessageMedia({
                    media: product.location[viewIndex - 1].photo,
                    type: "photo",
                    caption: (viewIndex) + ") " +product.location[viewIndex - 1].url
                }, {
                    chat_id: chat_id,
                    message_id: message_id,
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, "❌ No Image exist")
            }
        }

        if (command === "/sold_products1") {
            const viewIndex = 1
            const product = await soldDB.find()
            const item = product[viewIndex - 1]
            const totalPics = product.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== viewIndex)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/10); index++){
                    newRows.push(rows.splice(0,10))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/sold_products ${items}`
                        }
                    })
                })
                const text = `<b>${viewIndex}) ✅ ${item.name} (x${item.qty})\nNeighbourhood: ${item.neighbourhood}\nLocation: ${item.location.url}</b>`
                return await Bot.sendPhoto(chat_id, item.location.photo, {
                    caption: text,
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, "❌ Nothing is here")
            }
        }

        if (command === "/sold_products") {
            const viewIndex = parseInt(array[0])
            const product = await soldDB.find()
            const item = product[viewIndex - 1]
            const totalPics = product.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== viewIndex)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/10); index++){
                    newRows.push(rows.splice(0,10))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/sold_products ${items}`
                        }
                    })
                })
                const text = `<b>${viewIndex}) ✅ ${item.name} (x${item.qty})\nNeighbourhood: ${item.neighbourhood}\nLocation: ${item.location.url}</b>`
                return await Bot.editMessageMedia({
                    media: item.location.photo,
                    type: "photo",
                    caption: text,
                    parse_mode: "HTML"
                }, {
                    chat_id: chat_id,
                    message_id: message_id,
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, "❌ No Image exist")
            }
        }

        if (command === "/admin_delete_drop") {
            const pid = parseInt(array[0])
            const indexId = parseInt(array[1])
            const product = await productDB.findOne({ _id: pid })
            const toDelete = product.location[indexId]
            if (product.location.length <= 1) {
                await productDB.updateOne({ _id: pid }, {active: false})
            }
            await productDB.updateOne({ _id: pid }, {$pull: {location: toDelete}})
            const text = `<i>✅ Drop deleted</i>`
            await Bot.deleteMessage(chat_id, message_id)
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }

        if (query === "/broadcast") {
            if (chat_id == process.env.ADMIN_ID) {
                callbackAnswer[chat_id].wait = "broadcast"
                const button = [
                    ["✖️ Cancel"]
                ]
                return await Bot.sendMessage(chat_id, "<i>🚀 Enter the message to broadcast</i>", {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: button,
                        resize_keyboard: true
                    }
                })
            }
        }

        if (query === "/cancel_broadcast") {
            const key = [
                ["⭐ Shop", "📃 Orders"],
                ["💬 Support", "🛒 Cart"]
            ]
            if (process.env.ADMIN_ID == chat_id) {
                key.push(["⚙️ Admin Settings"])
            }
            Bot.deleteMessage(chat_id, message_id)
            return await Bot.sendMessage(chat_id, "✖️ Broadcasting cancelled", {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command === "/send_broadcast") {
            const id = parseInt(array[0])
            const users = await userDB.find({})
            bcast_sent[chat_id] = 0
            const totalUsers = users.length
            const key = [
                ["⭐ Shop", "📃 Orders"],
                ["💬 Support", "🛒 Cart"]
            ]
            if (process.env.ADMIN_ID == chat_id) {
                key.push(["⚙️ Admin Settings"])
            }
            Bot.deleteMessage(chat_id, message_id)
            await Bot.sendMessage(chat_id, "✅ Sending message to " + totalUsers + " users", {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
            const cronTask = cronJob.schedule("* * * * * *", async () => {
                users.splice(0, 1).forEach(async item => {
                    bcast_sent[chat_id] = bcast_sent[chat_id] + 1
                    const user_id = item._id
                    try {
                        await Bot.copyMessage(user_id, chat_id, id)
                    } catch (err) { }
                    
                    if (bcast_sent[chat_id] >= totalUsers) {
                        await Bot.sendMessage(chat_id, "✅ Broadcast completed")
                        cronTask.stop()
                    }
                })
            })
        }

    } catch (err) {
       console.log(err);
    }

}

const onMessage = async (msg) => {
    try {
        const chat_id = msg.chat.id
        const waitfor = callbackAnswer?.[chat_id]?.wait

        if (waitfor === "broadcast") {
            callbackAnswer[chat_id].wait = null
            if (msg?.text == "✖️ Cancel") {
                return await start(msg)
            }
            const msg_id = msg.message_id
            const text = `<i>🚀 Are you sure to send?</i>`
            const key = [
                [{text: "✅ Send", callback_data: `/send_broadcast ${msg_id}`},{text: "❌ Cancel", callback_data: "/cancel_broadcast"}]
            ]
            await Bot.copyMessage(chat_id, chat_id, msg_id)
            await Bot.sendMessage(chat_id, "👆 Preview")
            await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
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
    onCallBackQuery,
    onMessage
}