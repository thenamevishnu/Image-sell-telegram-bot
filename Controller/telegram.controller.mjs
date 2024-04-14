import env from "dotenv"
import Bot from "../Telegram/Config.mjs"
import { countryDB } from "../Models/country.model.mjs"
import { cityDB } from "../Models/city.model.mjs"
import { productDB } from "../Models/product.model.mjs"
import axios from "axios"
import { cartDB } from "../Models/cart.model.mjs"
import { Types } from "mongoose"
import { createPaymentLink, createPayout } from "../Utils/oxapay.mjs"
import { userDB } from "../Models/user.model.mjs"
import { orderDB } from "../Models/orders.model.mjs"
import { neighbourhoodDB } from "../Models/neighbourhood.model.mjs"
import cronJob from "node-cron"
import { soldDB } from "../Models/sold.model.mjs"
import { answerCallback, answerStore, chatCallback, getMainKey, getMainText } from "../Utils/Tg.mjs"
import { botConfig } from "../botConfig.mjs"
import { payoutDB } from "../Models/payout.model.mjs"
import { customProductDB } from "../Models/custom.product.model.mjs"
import { customCartDB } from "../Models/custom.cart.model.mjs"
import { customOrdersDB } from "../Models/custom.orders.model.mjs"
import { customNeighbourhoodDB } from "../Models/custom.neighbourhood.model.mjs"
import { partnersDB } from "../Models/partners.model.mjs"

env.config()

let bcast_sent = {}

const start = async (msg, match) => {
    if(msg.chat.type != "private") return
    try {
        const text = getMainText()
        const key = await getMainKey(msg.chat.id)
        let inviter = match[1] || 0
        const user = await userDB.findOne({ _id: msg.chat.id })
        if (!user) {
            const checkInviter = await userDB.findOne({ _id: inviter })
            if (!checkInviter) {
                inviter = 0
            }
            await userDB.create({ _id: msg.chat.id, first_name: msg.chat.first_name, username: msg.chat.username, inviter: inviter })
            const userMention = msg.chat.username ? `@${msg.chat.username}` : `<a href='tg://user?id=${msg.chat.id}'>${msg.chat.first_name}</a>`
            let inviteUserMention = "--"
            if (checkInviter) {
                await userDB.updateOne({_id: inviter},{$inc:{invites: 1}})
                inviteUserMention = checkInviter.username ? `@${checkInviter.username}` : `<a href='tg://user?id=${checkInviter._id}'>${checkInviter.first_name}</a>`
            }
            await Bot.sendMessage(process.env.ADMIN_ID, `<b>👤 New User\n🛰️ UserName: ${userMention}\n🫳 InvitedBy: ${inviteUserMention}</b>`, {
                parse_mode: "HTML"
            })
        }
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: key,
                resize_keyboard: true
            }
        })
    } catch(err) {
        console.log(err.message);
    }
}

const shop = async (msg) => {
    if(msg.chat.type != "private") return
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
        console.log(err.message);
    }
}

const custom = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const countries = await countryDB.find({})
        const key = countries.map(item => {
            return [{text: item.name, callback_data: `/c_select_country | ${item.name}`}]
        })
        const text = `🌍 Select a country`
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const accountBalance = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const user = await userDB.findOne({ _id: msg.chat.id })
        const key = [
            [{text: "📤 Get Paid", callback_data: "/getPaid"},{text: "📃 Payout History", callback_data: "/payoutHistory"}]
        ]
        const text = `<b>💰 Available Balance: <code>${user.balance.toFixed(6)} BTC</code></b>`
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const affiliateLink = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const user = await userDB.findOne({ _id: msg.chat.id })
        const refLink = `https://t.me/${process.env.BOT_NAME}?start=${msg.chat.id}`
        const key = [
            [{text: "📃 My Referral List", callback_data: "/referral_list"}]
        ]
        const text = `<b>💰 Each affiliate partner will earn 10% of each sale from the invited customers, for life. Get your P's up bale gang\n\n🛰️ You've invited: <code>${user.invites} Members</code>\n\n🔗 Affiliate Link: ${refLink}</b>`
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const preCart = async (msg) => {
    if(msg.chat.type != "private") return
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
       console.log(err.message);
    }
}

const customCart = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const chat_id = msg.chat.id
        const cart = await customCartDB.aggregate([
            {
                $match: {
                    user_id: chat_id
                }
            }, {
                $lookup: {
                    from: "c_products",
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
            return [{ text: `${item.product[0].name} (Qty: ${item.qty})`, callback_data: `0` }, {text: "Checkout 🎯", callback_data: `/c_view ${item.product_id}`}, {text: "❌", callback_data: `/c_remove_cart ${item.product_id}`}]
        })
        return await Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
       console.log(err.message);
    }
}

const cart = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const key = [
            ["🛒 Pre-Drop", "🛒 Custom-Drop"],
            ["🔙 Back"]
        ]
        return await Bot.sendMessage(msg.chat.id, "<i>🚀 Select type</i>", {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: key,
                resize_keyboard: true
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const orders = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const text = "🚀 Select type"
        const key = [
            ["📃 Pre-Drop Orders", "📃 Custom-Drop Orders"],
            ["🔙 Back"]
        ]
        return Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: key,
                resize_keyboard: true
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const preOrders = async (msg) => {
    if(msg.chat.type != "private") return
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
        console.log(err.message);
    }
}

const customOrders = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const orders = await customOrdersDB.aggregate([
            {
                $match: {
                    user_id: msg.chat.id
                }
            }, {
                $lookup: {
                    from: "c_products",
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
            return [{text: `${item.product[0].name} x ${item.qty}`, callback_data: `/c_view_order ${item._id}`},{text: "💬 Chat", callback_data: `/chat ${item._id}`}]
        })
        return Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const support = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const text = "<code>💬 Feel free to share your question in a single message.</code>"
        answerCallback[msg.chat.id] = "support_message"
        const key = [
            ["❌ Cancel"]
        ]
        return await Bot.sendMessage(msg.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: key,
                resize_keyboard: true
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const adminPanel = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const chat_id = msg.chat.id
        if (process.env.ADMIN_ID != chat_id) {
            return
        }
        const key = [
            [
                {text: "🛰️ Broadcast to users", callback_data: "/broadcast"}
            ],
            [
                { text: "➕ Add Country", callback_data: "/admin_add country" },
                { text: "➕ Add Product", callback_data: "/admin_add product" },
                { text: "➕ Add City", callback_data: "/admin_add city" }
            ], [
                { text: "➕ Add Neighbourhood", callback_data: "/admin_add neighbour" },
                { text: "➕ Add Custom Product", callback_data: "/admin_add c_product"}
            ], [
                { text: "➕ Add Custom Neighbourhood", callback_data: "/admin_add c_neighbour" }  
            ],[
                { text: "📃 Neighbourhood List", callback_data: "/admin_list neighbour" }  
            ],
            [
                { text: "📃 Country List", callback_data: "/admin_list country" },
                { text: "🛰️ Sold products", callback_data: "/sold_products1" },
                { text: "📃 City List", callback_data: "/admin_list city" }
            ],
            [
                {text: "👇 product List 👇", callback_data: "0"}
            ],
            [
                { text: "📦 Pre-Drops", callback_data: "/list_products pre-drops" },
                { text: "📦 Custom-Drops", callback_data: "/list_products custom-drops" }
            ],[
                { text: "🤝 Add Partners", callback_data: "/add_partners" },
                { text: "✌️ Manage Partners", callback_data: "/manage_partners" }
            ]
        ]
        const text = "Admin Panel"
        return Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
    }
}

const partnerPanel = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const chat_id = msg.chat.id
        const partners = await partnersDB.find()
        const partnerList = partners.map(item => item._id)
        if(!partnerList.includes(chat_id)) return
        const key = [
            [
                {text: "➕ Add Drops", callback_data: "/partner_add_drop"}
            ]
        ]
        const text = "🔐 Partnets Panel"
        return Bot.sendMessage(chat_id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        console.log(err.message);
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

        if (!answerStore[chat_id]) {
            answerStore[chat_id] = {}
        }

        if (command === "/add_partners") {
            const text = `🛰️ Forward any message from your partner!`
            const key = [
                ["❌ Cancel"]
            ]
            answerCallback[chat_id] = "add_partners"
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command == "/remove_partner") {
            const id = array[0]
            const partner = await partnersDB.findOne({_id: id})
            const text = `✌️ Are you sure to remove ${partner.first_name} ?`
            const key = [
                [{text: "🔙 Back", callback_data: "/manage_partners"},{text: "✅ Yes", callback_data: `/partner_remove ${id}`}]
            ]
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command == "/partner_remove") {
            const id = array[0]
            await partnersDB.deleteOne({ _id: id })
            const partner = await partnersDB.find()
            const key = partner.map(item => {
                return [
                    { text: `${item.first_name}`, url: `${item.username ? `https://t.me/${item.username}` : `tg://user?id=${item._id}`}` },
                    { text: `❌ Remove`, callback_data: `/remove_partner ${item._id}`}
                ]
            })
            const text = `List of partners`
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/manage_partners") {
            const text = `List of partners`
            const partner = await partnersDB.find()
            Bot.deleteMessage(chat_id, message_id)
            const key = partner.map(item => {
                return [
                    { text: `${item.first_name}`, url: `${item.username ? `https://t.me/${item.username}` : `tg://user?id=${item._id}`}` },
                    { text: "🔑 Access", callback_data: `/partner_access ${item._id}`},
                    { text: `❌ Remove`, callback_data: `/remove_partner ${item._id}` }
                ]
            })
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_add_drop") {
            const partner = await partnersDB.findOne({ _id: chat_id })
            if (!partner) {
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ Something error happend!",
                    show_alert: true
                })
            }
            const products = await productDB.find({ _id: { $in: partner.products } })
            const text = `<b>🛒 Select the product you want to add drops!</b>`
            const key = products.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `/partner_drop_add ${item._id}`}
                ]
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

        if (command === "/partner_drop_add") {
            const [product_id] = array
            const key = [
                [
                    { text: "View Drop", callback_data: `/partner_view_drop ${product_id} 0` },
                    { text: "🖊️ Add/Change Drop", callback_data: `/admin_change Drop ${product_id}` }]
            ]
            return await Bot.editMessageText("<i>⚙️ Drop settings</i>", {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_view_drop") {
            const pid = parseInt(array[0])
            const viewIndex = parseInt(array[1])
            const product = await productDB.findOne({ _id: pid })
            const locations = product.location.filter(item => item.added === chat_id)
            const totalPics = locations.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== viewIndex+1)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/5); index++){
                    newRows.push(rows.splice(0,5))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/partner_view_drop1 ${pid} ${items-1}`
                        }
                    })
                })
                const back = [{ text: "🔙 Back", callback_data: `/admin_remove_view` }]
                const del = [{ text: "❌ Delete", callback_data: `/partner_delete_drop ${pid} ${locations[viewIndex]._id}` }]
                key.push(back)
                key.unshift(del)
                return await Bot.sendPhoto(chat_id, locations[viewIndex].photo, {
                    caption: "1) "+ locations[viewIndex].url || "No Location url",
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ Drops are empty or sold out!",
                    show_alert: true
                })
            }
        }

        if (command === "/partner_view_drop1") {
            const pid = parseInt(array[0])
            const viewIndex = parseInt(array[1])
            const product = await productDB.findOne({ _id: pid })
            const locations = product.location.filter(item => item.added === chat_id)
            const totalPics = locations.length
            if (totalPics > 0) {
                const rows = new Array(totalPics).fill(0).map((_, index) => index + 1).filter(item => item !== viewIndex+1)
                let newRows = []
                for (let index = 1; index <= Math.ceil(totalPics/5); index++){
                    newRows.push(rows.splice(0,5))
                }
                const key = newRows.map(item => {
                    return item.map(items => {
                        return {
                            text: items,
                            callback_data: `/partner_view_drop1 ${pid} ${items-1}`
                        }
                    })
                })
                const back = [{ text: "🔙 Back", callback_data: `/admin_remove_view` }]
                const del = [{ text: "❌ Delete", callback_data: `/partner_delete_drop ${pid} ${locations[viewIndex]._id}` }]
                key.push(back)
                key.unshift(del)
                return await Bot.editMessageMedia({ media: locations[viewIndex].photo, type: "photo", caption: ""+(viewIndex+1)+") "+ locations[viewIndex].url || "No Location url"},{
                    chat_id: chat_id,
                    message_id: message_id,
                    reply_markup: {
                        inline_keyboard: key
                    }
                })
            } else {
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ Drops are empty or sold out!",
                    show_alert: true
                })
            }
        }

        if (command === "/partner_delete_drop") {
            const pid = parseInt(array[0])
            const indexId = array[1]
            const product = await productDB.findOne({ _id: pid })
            const toDelete = product.location.find(item => item._id == indexId)
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

        if (command === "/partner_access") {
            const userid = array[0]
            const key = [
                [
                    { text: "💷 Set Partner Amount", callback_data: `/partner_spa ${userid}` }
                ],
                [
                    { text: "🏙️ Cities", callback_data: `/parner_cities ${userid}` },
                    { text: "🛒 Products", callback_data: `/parner_products ${userid}` }
                ], [
                    { text: "🔙 Back", callback_data: `/manage_partners` }
                ]
            ]
            const text = `<b>🔑 List of access</b>`
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_spa") {
            const [userid] = array
            const products = await partnersDB.aggregate([
                {
                    $match: {
                        _id: Number(userid)
                    }
                }, {
                    $lookup: {
                        from: "products",
                        localField: "products",
                        foreignField: "_id",
                        as: "product_info"
                    }
                }
            ])
            const partner = await partnersDB.findOne({ _id: userid })
            const key = products?.[0]?.product_info?.map(item => {
                const itemPerc = partner.commission.find(items => items.product_id == item?._id)
                return [
                    { text: `${item.name} - ${item.price} euro`, callback_data: `/partner_seta ${userid} ${item._id}` },
                    { text: `${itemPerc?.percent || 0}%`, callback_data: `/partner_seta ${userid} ${item._id}`}
                ]
            }) || []
            key.push([ { text: "🔙 Back", callback_data: `/partner_access ${userid}` } ])
            return await Bot.editMessageText(`<i>🛒 Select the product to add partner commission</i>`, {
                parse_mode: "HTML",
                chat_id: chat_id,
                message_id: message_id,
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_seta") {
            const [userid, itemid] = array
            const text = `<i>🫴 Enter the % to give partner from the sale</i>`
            answerCallback[chat_id] = "partner_set_amount"
            answerStore[chat_id]["params"] = [userid, itemid] 
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [
                        ["❌ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }

        if (command === "/parner_cities") {
            const userid = array[0]
            const cities = await cityDB.find()
            const listOfCities = await partnersDB.findOne({ _id: userid })
            const key = cities.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `0` },
                    { text: `${listOfCities.cities.includes(item._id) ? `✅` : `❌`}`, callback_data: `/partner_ac ${userid} ${item._id}` }
                ]
            })
            key.push([ { text: "🔙 Back", callback_data: `/partner_access ${userid}` } ])
            const text = `<b>🔑 List of access</b>`
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_ac") {
            const [userid, itemid] = array
            const findData = await partnersDB.findOne({ _id: userid })
            if (findData.cities.includes(new Types.ObjectId(itemid))) {
                await partnersDB.updateOne({
                    _id: Number(userid)
                }, {
                    $pull: {
                        cities: new Types.ObjectId(itemid)
                    }
                })
            } else {
                await partnersDB.updateOne({
                    _id: Number(userid)
                }, {
                    $push: {
                        cities: new Types.ObjectId(itemid)
                    }
                })
            }
            const cities = await cityDB.find()
            const listOfCities = await partnersDB.findOne({ _id: userid })
            const key = cities.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `0` },
                    { text: `${listOfCities.cities.includes(item._id) ? `✅` : `❌`}`, callback_data: `/partner_ac ${userid} ${item._id}` }
                ]
            })
            key.push([{ text: "🔙 Back", callback_data: `/partner_access ${userid}` }])
            return await Bot.editMessageReplyMarkup({ inline_keyboard: key }, {
                chat_id: chat_id,
                message_id: message_id
            })
        }

        if (command === "/parner_products") {
            const userid = array[0]
            const listOfCities = await partnersDB.aggregate([
                {
                    $match: {
                        _id: Number(userid)
                    }
                }, {
                    $lookup: {
                        from: "cities",
                        localField: "cities",
                        foreignField: "_id",
                        as: "cityList"
                    }
                }
            ])
            const key = listOfCities?.[0]?.cityList?.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `/partner_sc ${userid} ${item._id}` }
                ]
            })
            key.push([ { text: "🔙 Back", callback_data: `/partner_access ${userid}` } ])
            const text = `<b>🏙️ Select city to give product access</b>`
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_sc") {
            const [userid, itemid] = array
            const text = `<b>🔑 Product access</b>`
            const city = await cityDB.findOne({ _id: itemid })
            const neighbour = await neighbourhoodDB.find({ city: city.name })
            const neighbourList = neighbour.map(item => item.name )
            const products = await productDB.find({ neighbourhood: { $in: neighbourList } })
            const partners = await partnersDB.findOne({ _id: userid })
            const key = products.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `0` },
                    { text: `${partners.products.includes(item._id) ? `✅` : `❌`}`, callback_data: `/partner_pa ${userid} ${item._id} ${itemid}` }
                ]
            })
            key.push([ { text: "🔙 Back", callback_data: `/parner_products ${userid}` } ])
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/partner_pa") {
            const [userid, prodid, itemid] = array
            const findData = await partnersDB.findOne({ _id: userid })
            if (findData.products.includes(Number(prodid))) {
                await partnersDB.updateOne({
                    _id: Number(userid)
                }, {
                    $pull: {
                        products: Number(prodid)
                    }
                })
            } else {
                await partnersDB.updateOne({
                    _id: Number(userid)
                }, {
                    $push: {
                        products: Number(prodid)
                    }
                })
            }
            const city = await cityDB.findOne({ _id: itemid })
            const neighbour = await neighbourhoodDB.find({ city: city.name })
            const neighbourList = neighbour.map(item => item.name )
            const products = await productDB.find({ neighbourhood: { $in: neighbourList } })
            const partners = await partnersDB.findOne({ _id: userid })
            const key = products.map(item => {
                return [
                    { text: `${item.name}`, callback_data: `0` },
                    { text: `${partners.products.includes(item._id) ? `✅` : `❌`}`, callback_data: `/partner_pa ${userid} ${item._id} ${itemid}` }
                ]
            })
            console.log(key);
            key.push([{ text: "🔙 Back", callback_data: `/parner_products ${userid}` }])
            return await Bot.editMessageReplyMarkup({ inline_keyboard: key }, {
                chat_id: chat_id,
                message_id: message_id
            })
        }

        if (command === "/list_products") {
            const type = array[0]
            const key = []

            if (type == "pre-drops") {
                const products = await productDB.find({})
                if (products.length > 0) {
                    const keys = products.map(item => {
                        const items =  [
                            {
                                text: `${item.name} - ${item.price} ${item.currency}`, callback_data: `/admin_products ${item._id} 0`
                            }
                        ]
                        key.push(items)
                        return true
                    })
                }
                const text = type
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    reply_markup: {
                        inline_keyboard: key
                    },
                    parse_mode: "HTML"
                })
            }

            if (type == "custom-drops") {
                const products = await customProductDB.find({})
                if (products.length > 0) {
                    const keys = products.map(item => {
                        const items =  [
                            {
                                text: `${item.name} - ${item.price} ${item.currency}`, callback_data: `/admin_products ${item._id} 1`
                            }
                        ]
                        key.push(items)
                        return true
                    })
                }
                const text = type
                return await Bot.editMessageText(text, {
                    chat_id: chat_id,
                    message_id: message_id,
                    reply_markup: {
                        inline_keyboard: key
                    },
                    parse_mode: "HTML"
                })
            }
        }

        if (command === "/replymsg") {
            const uid = parseInt(array[0])
            answerStore[chat_id].replymsg = uid
            answerStore[chat_id].replying = message_id
            answerStore[chat_id].msg_id = message_id
            answerStore[chat_id].reply_markup = JSON.stringify(callback.message.reply_markup.inline_keyboard)
            answerCallback[chat_id] = "replymsg_admin"
            const text = "Enter the reply"
            return await Bot.sendMessage(chat_id, text, {
                reply_markup: {
                    keyboard: [
                        ["❌ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }

        if (command === "/mark_sold") {
            const id = array[0]
            const resData = await customOrdersDB.findOne({ _id: id })
            const key = callback.message.reply_markup.inline_keyboard
            if (resData.done) {
                await customOrdersDB.updateOne({ _id: new Types.ObjectId(id) }, { done: false })
                key.pop()
                key.push([{ text: "Status: Not Sold ❌", callback_data: "/mark_sold " + id }])
                chatCallback[resData.user_id] = null
            } else {
                await customOrdersDB.updateOne({ _id: new Types.ObjectId(id) }, { done: true })
                key.pop()
                key.push([{ text: "Status: Sold ✅", callback_data: "/mark_sold " + id }])
                chatCallback[resData.user_id] = id
            }
            await Bot.editMessageReplyMarkup({
                inline_keyboard: key
            }, {
                chat_id: chat_id,
                message_id: message_id
            })
            return await Bot.answerCallbackQuery(callback.id, {
                text: `✅ This order marked as: ${resData.done ? "❌ Not Sold" : "✅ Sold"}!`,
                show_alert: true
            })
        }

        if (command === "/seeLocation") {
            const id = array[0]
            const orders = await customOrdersDB.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(id)
                    }
                }, {
                    $lookup: {
                        from: "c_products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                }
            ])
            const text = `City: ${orders[0].city}\nLocation: ${orders[0].location}`
            return await Bot.answerCallbackQuery(callback.id, {
                text: text,
                show_alert: true
            })
        }

        if (command === "/seeProductInfo") {
            const id = array[0]
            const orders = await customOrdersDB.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(id)
                    }
                }, {
                    $lookup: {
                        from: "c_products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                }
            ])
            const text = `Product: ${orders[0].product[0].name}\nQty: ${orders[0].qty}\nStatus: Paid`
            return await Bot.answerCallbackQuery(callback.id, {
                text: text,
                show_alert: true
            })
        }

        if (command === "/seeMessageFrom") {
            const id = parseInt(array[0])
            const response = await Bot.getChat(id)
            const text = `FirstName: ${response.first_name}\nLastName: ${response.last_name}\nUserName: @${response.username}\nID: ${response.id}`
            return await Bot.answerCallbackQuery(callback.id, {
                text: text,
                show_alert: true
            })
        }

        if (command === "/chat") {
            const currentOrder = array[0]
            chatCallback[chat_id] = currentOrder
            const orders = await customOrdersDB.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(currentOrder)
                    }
                }, {
                    $lookup: {
                        from: "c_products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                }
            ])
            if (orders[0].done) {
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "✅ This order marked as Sold!",
                    show_alert: true
                })
            }
            const text = `<i>💬 Chat session started: ${orders[0].product[0].name}-x${orders[0].qty}\n🌍 Location: ${orders[0].location}</i>`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [
                        ["❌ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }

        if (query === "/referral_list") {
            const users = await userDB.find({ _id: { $ne: chat_id }, inviter: chat_id })
            let text = `<b>📃 List</b>\n`
            users.forEach((item, index) => {
                const userMention = item.username ? `@${item.username}` : `<a href='tg://user?id=${item._id}'>${item.first_name}</a>`
                text += `<b>\n${index+1}) ${userMention}</b>`
            })
            if (users.length == 0) {
                text += "\nNo Referrals yet!"
            }
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }

        if (query === "/payoutHistory") {
            const payouts = await payoutDB.find({ user_id: chat_id }).sort({ createdAt: -1 }).limit(5)
            let text = `<b>📃 Last 5 payout list</b>`
            if (payouts.length == 0) {
                text+= "\n\nNo payout history yet!"
            }
            payouts.forEach((item, index) => {
                text += `\n\n<code>${index+1}) </code><b>💰 ${item.amount} ${item.currency}\n🛰️ TxID: <code>${item.txID}</code></b>`
            })
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML"
            })
        }

        if (query === "/getPaid") {
            const user = await userDB.findOne({ _id: chat_id })
            const balance = user.balance
            if (balance < botConfig.PAYOUT.MINIMUM) {
                return await Bot.answerCallbackQuery(callback.id, {
                    text: `❌ Minimum payout is ${botConfig.PAYOUT.MINIMUM} BTC, You have only ${balance.toFixed(6)} BTC`,
                    show_alert: true
                })
            }
            answerCallback[chat_id] = "payout"
            const text = `<i>📤 Enter the amount to withdraw in BTC\nYou have: ${balance.toFixed(6)} BTC</i>`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard : [
                        ["❌ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }

        if (query === "/shop") {
            const countries = await countryDB.find({})
            const key = countries.map(item => {
                return [{text: item.name, callback_data: `/select_country | ${item.name}`}]
            })
            const text = `🌍 Select a country`
            answerStore[chat_id] = {}
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (query === "/custom") {
            const countries = await countryDB.find({})
            const key = countries.map(item => {
                return [{text: item.name, callback_data: `/c_select_country | ${item.name}`}]
            })
            const text = `🌍 Select a country`
            answerStore[chat_id] = {}
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
            answerStore[chat_id].country = country
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/c_select_country") {
            const country = params[0]
            const text = `🏙️ Select a city`
            const cities = await cityDB.find({country: country})
            const key = cities.map(item => {
                return [{text: item.name, callback_data: `/c_select_city | ${item.name}`}]
            })
            key.push([{ text: "🔙 Back", callback_data: "/custom" }])
            answerStore[chat_id].country = country
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
            const country = answerStore[chat_id].country
            key.push([{ text: "🔙 Back", callback_data: `/select_country | ${country}` }])
            answerStore[chat_id].city = city
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/c_select_city") {
            const city = params[0]
            const text = `🏙️ ${city}\n◾◾◾◾◾\nSelect a neighbourhood`
            const neighbourhood = await customNeighbourhoodDB.find({city: city})
            const key = neighbourhood.map(item => {
                return [{text: `${item.name} - (Delivery: ${item.delivery} euro)`, callback_data: `/c_select_neighbour | ${item.name} | ${item.delivery}`}]
            })
            const country = answerStore[chat_id].country
            key.push([{ text: "🔙 Back", callback_data: `/c_select_country | ${country}` }])
            answerStore[chat_id].city = city
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
            const city = answerStore[chat_id].city
            key.push([{ text: "🔙 Back", callback_data: `/select_city | ${city}` }])
            answerStore[chat_id].neighbour = neighbour
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (command === "/c_select_neighbour") {
            const neighbour = params[0]
            const delivery = parseFloat(params[1])
            const text = `🏙️ ${neighbour} - Delivery: ${delivery} euro\n◾◾◾◾◾\nType your address for the delivery 🚚`
            const key = [
                ["❌ Cancel"]
            ]
            answerCallback[chat_id] = "enter_custom_location"
            answerStore[chat_id].neighbour = neighbour
            answerStore[chat_id].delivery = delivery
            await Bot.deleteMessage(chat_id, message_id)
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command === "/select_product") {
            const product_id = array[0]
            const product = await productDB.findOne({ _id: product_id })
            if (!product.active) {
                return Bot.answerCallbackQuery(callback.id, {
                    text: "✖️ Product is not available!",
                    show_alert: true
                })
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

        if (command === "/c_select_product") {
            const product_id = array[0]
            const product = await customProductDB.findOne({ _id: product_id })
            if (!product.active) {
                return Bot.answerCallbackQuery(callback.id, {
                    text: "✖️ Product is not available!",
                    show_alert: true
                })
            }
            const location = answerStore[chat_id].custom_location
            const text = `🏙️ ${location}\n◾◾◾◾◾\n📦 ${product.name}\n💵 ${product.price} ${product.currency}\nℹ️ No description`
            const key = [[
                {
                    text:"➕ Add to cart", callback_data: `/c_addtocart ${product_id} 1`
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

        if (command === "/c_addtocart") {
            const product_id = array[0]
            const qty = parseInt(array[1])
            let key = null
            if (qty == 0) {
                key = [
                    [{text:"➕ Add to cart", callback_data: `/addtocart ${product_id} 1`}]
                ]
            } else {
                key = [[
                    {text: "➖", callback_data: `/c_addtocart ${product_id} ${qty - 1}`},
                    {text:`🛒 ${qty}`, callback_data: "0"},
                    {text: "➕", callback_data: `/c_addtocart ${product_id} ${qty + 1}`}
                ]]
            }
            const user_id = chat_id
            const location = answerStore[chat_id].custom_location
            const delivery = answerStore[chat_id].delivery
            await axios.post(`${process.env.SERVER}/cart/custom/create`, { product_id, user_id, qty, location, delivery })
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

        if (command === "/c_remove_cart") {
            const product_id = array[0]
            await axios.delete(`${process.env.SERVER}/cart/custom/delete/${product_id}/${chat_id}`)
            const cart = await customCartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id
                    }
                }, {
                    $lookup: {
                        from: "c_products",
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
                return [{text: `${item.product[0].name} (Qty: ${item.qty})`, callback_data: `/c_view ${item.product_id}`},{text: "❌", callback_data: `/remove_cart ${item.product_id}`}]
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

        if (command === "/c_view") {
            const product_id = parseInt(array[0])
            const cart = await customCartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id,
                        product_id: product_id
                    }
                }, {
                    $lookup: {
                        from: "c_products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                }
            ])
            const key = [
                [{text: "📃 Create Order", callback_data: `/c_create_order ${product_id}`}]
            ]
            const text = `<b>📦 ${cart[0].product[0].name} (${cart[0].qty}) * ${cart[0].product[0].price} = 💵 ${cart[0].product[0].price * cart[0].qty}\n◾◾◾◾◾◾◾◾◾◾\nTotal: ${( cart[0].product[0].price * cart[0].qty ) + cart[0].delivery} ${cart[0].product[0].currency}\n💵 Product Price: ${cart[0].product[0].price * cart[0].qty} euro\n💰 Delivery: ${cart[0].delivery} euro</b>`
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ No Drop were found in this product",
                    show_alert: true
                })
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

        if (command === "/c_create_order") {
            const product_id = parseInt(array[0])
            const cart = await customCartDB.aggregate([
                {
                    $match: {
                        user_id: chat_id,
                        product_id: product_id
                    }
                }, {
                    $lookup: {
                        from: "c_products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                }
            ])
            const total = cart[0].product[0].price * cart[0].qty
            const delivery = cart[0].delivery
            const resData = await axios.get('https://min-api.cryptocompare.com/data/price', {
                params: {
                    fsym: 'BTC',
                    tsyms: 'EUR',
                },
            });
            const rate = resData.data.EUR
            const rateInBTC = (total+delivery) / rate
            const orderId = Math.floor(new Date().getTime() / 1000)
            const cartId = cart[0]._id
            const response = await createPaymentLink(chat_id, rateInBTC, `${process.env.SERVER}/payment/custom/callback/${cartId}`, orderId)
            if (response.result == 100 && response.message == "success") {
                const text = `<b>📃 Your order <code>#${orderId}</code> is created:\nTotal: 💵 ${total+delivery} ${cart[0].product[0].currency}\n💵 Product Price: ${total} euro\n💰 Delivery: ${delivery} euro</b>`
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

        if (command === "/c_view_order") {
            const orderId = array[0]
            const order = await customOrdersDB.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(orderId)
                    }
                }, {
                    $lookup: {
                        from: "c_products",
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
            const text = `<b>📦 ${orderInfo.product[0].name}\n🌍 Location: ${orderInfo.location}\n🛒 Qty: <code>${orderInfo.qty}</code>\n💵 Total Amount: <code>${orderInfo.payment.amount} ${orderInfo.payment.currency}</code>\n📃 OrderId: <code>#${orderInfo.payment.orderId}</code>\n#️⃣ txID: <code>${orderInfo.payment.txID}</code>\n\nDate: <code>${new Date(orderInfo.payment.date * 1000).toUTCString()}</code></b>`
            await Bot.deleteMessage(chat_id, message_id)
            return Bot.sendPhoto(chat_id, orderInfo.product[0].product_image, {
                caption: text,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        }

        if (command === "/replyto") {
            const user_id = array[0]
            const text = `💬 Send reply in single message`
            const key = [
                ["❌ Cancel"]
            ]
            answerCallback[chat_id] = "admin_reply"
            answerStore[chat_id].replyTo = user_id
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command === "/admin_add") {
            const type = array[0]
            if (type == "country") {
                const text = `Enter country name (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)`
                answerCallback[chat_id] = "add_admin_country"
                const key = [
                    ["❌ Cancel"]
                ]
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
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

            if (type == "c_neighbour") {
                const text = `Select city to add neighbourhood!`
                const cities = await cityDB.find({})
                const key = cities.map(item => {
                    return [{text: item.name, callback_data: `/c_add_neighbour_to | ${item.name}`}]
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

            if (type == "c_product") {
                answerCallback[chat_id] = "c_add_product_name"
                const key = [
                    ["❌ Cancel"]
                ]
                const text = `Enter your custom product name`
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
                })
            }
        }

        if (command === "/add_city_to") {
            const country = params[0]
            answerStore[chat_id].country = country
            const text = `Enter city name to add in ${country} (Eg: Serbia) or seperate by commas (Eg: Serbia,Greece,other,...)`
            const key = [
                ["❌ Cancel"]
            ]
            answerCallback[chat_id] = "add_admin_city"
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command === "/add_neighbour_to") {
            const city = params[0]
            answerStore[chat_id].city = city
            answerCallback[chat_id] = "add_admin_neighbour"
            const text = `Enter neighbour name to add in ${city} (Eg: city1) or seperate by commas (Eg: city1,city2,other,...)`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }

        if (command === "/c_add_neighbour_to") {
            const city = params[0]
            answerStore[chat_id].city = city
            answerCallback[chat_id] = "c_add_admin_neighbour"
            const text = `Enter neighbourhood name and delivery price to add in ${city} (Eg: city1|5) or seperate by comma (Eg: city1|5,city2|10,other|25,...)`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }

        if (command === "/add_product_to") {
            const neighbourId = params[0]
            const neighbour = await neighbourhoodDB.findOne({ _id: neighbourId })
            answerCallback[chat_id] = "add_product_name"
            const key = [
                ["❌ Cancel"]
            ]
            answerStore[chat_id].neighbour = neighbour.name
            const text = `Adding product to {City: ${neighbour.city}}\n\nEnter your product name`
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (command === "/status_change") {
            const product_id = parseInt(array[0])
            const status = array[1]
            const ptype = array[2]
            ptype==0 ? await productDB.updateOne({ _id: product_id }, { $set: { active: status } }) : await customProductDB.updateOne({ _id: product_id }, { $set: { active: status } })
            let product = ptype==0?await productDB.findOne({_id: product_id}):await customProductDB.findOne({_id: product_id})
            const key = [
                [{ text: `${product.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${product_id} ${!product.active} ${ptype}` }, { text: `❌ Delete`, callback_data: `/deleteProduct ${product_id} ${ptype}` }],
                [{ text: "View Product Image", callback_data: `/admin_view_pimage ${product_id} ${ptype}`}],
                [{ text: `🖊️ Edit Name`, callback_data: `/admin_change Name ${product_id} ${ptype}` }, { text: `🖊️ Edit Image`, callback_data: `/admin_change Pimage ${product_id} ${ptype}` }, { text: `🖊️ Edit Price`, callback_data: `/admin_change Price ${product_id} ${ptype}` }],
                
            ]
            ptype==0 && key.push([{text: "View Drop", callback_data: `/admin_view_drop ${product_id}`}, { text: "🖊️ Add/Change Drop", callback_data: `/admin_change Drop ${product_id}`}])
            key.push([{text: "🔙 Back", callback_data: `/list_products ${ptype==0?"pre-drops":"custom-drops"}`}])
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
            const ptype = array[1]
            let product = null
            if (ptype == 0) {
                product = await productDB.findOne({_id: product_id})
            } else {
                product = await customProductDB.findOne({_id: product_id})
            }
            const text = `<b>Title: ${product.name}\nPrice: ${product.price} ${product.currency}\n</b>`
            const key = [
                [{ text: `${product.active ? `✅ Active` : `❌ Disabled`}`, callback_data: `/status_change ${product_id} ${!product.active} ${ptype}` }, { text: `❌ Delete`, callback_data: `/deleteProduct ${product_id} ${ptype}` }],
                [{ text: "View Product Image", callback_data: `/admin_view_pimage ${product_id} ${ptype}`}],
                [{ text: `🖊️ Edit Name`, callback_data: `/admin_change Name ${product_id} ${ptype}` }, { text: `🖊️ Edit Image`, callback_data: `/admin_change Pimage ${product_id} ${ptype}` }, { text: `🖊️ Edit Price`, callback_data: `/admin_change Price ${product_id} ${ptype}` }],
                
            ]
            ptype==0 && key.push([{text: "View Drop", callback_data: `/admin_view_drop ${product_id}`}, { text: "🖊️ Add/Change Drop", callback_data: `/admin_change Drop ${product_id}`}])
            key.push([{text: "🔙 Back", callback_data: `/list_products ${ptype==0?"pre-drops":"custom-drops"}`}])
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
            const ptype = array[2]
            answerStore[chat_id].product_id = pid
            answerStore[chat_id].ptype = ptype
            if (type == "Name") {
                const key = [
                    ["❌ Cancel"]
                ]
                answerCallback[chat_id] = "edit_product_name"
                const text = `🖊️ Enter the title of your product!`
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
                })
            }

            if (type == "Price") {
                const text = `🖊️ Enter the price in digits (EUR) (Eg: 5)!`
                const key = [
                    ["❌ Cancel"]
                ]
                answerCallback[chat_id] = "edit_product_price"
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
                })
            }

            if (type == "Pimage") {
                const text = `🖊️ Send product image!`
                const key = [
                    ["❌ Cancel"]
                ]
                answerCallback[chat_id] = "edit_product_image"
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
                })
            }
            if (type == "Drop") {
                const text = `🖊️ Send Drop image and location url in caption!`
                const key = [
                    ["❌ Cancel"]
                ]
                answerCallback[chat_id] = "add_product_drop"
                await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: key,
                        resize_keyboard: true
                    }
                })
            }
        }

        if (command === "/deleteProduct") {
            const pid = parseInt(array[0])
            const ptype = array[1]
            return await Bot.editMessageText("<i>❓Are you sure to delete?</i>", {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🔙 Back", callback_data: `/admin_products ${pid} ${ptype}` },
                            { text: "✅ Yes", callback_data: `/confirm_delete ${pid} ${ptype}` }
                        ]
                    ]
                }
            })
        }

        if (command === "/confirm_delete") {
            const pid = parseInt(array[0])
            const ptype = array[1]
            ptype==0 ? await productDB.deleteOne({ _id: pid }) : await customProductDB.deleteOne({ _id: pid })
            const text = "✅ Product deleted"
            return await Bot.editMessageText(text, {
                chat_id: chat_id,
                message_id: message_id,
                parse_mode: "HTML",
            })
        }

        if (command === "/admin_view_pimage") {
            const pid = parseInt(array[0])
            const ptype = array[1]
            const product = ptype==0 ? await productDB.findOne({ _id: pid }) : await customProductDB.findOne({ _id: pid })
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ No Image exist",
                    show_alert: true
                })
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ No Image exist",
                    show_alert: true
                })
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ No Image exist",
                    show_alert: true
                })
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ Nothing is here",
                    show_alert: true
                })
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
                return await Bot.answerCallbackQuery(callback.id, {
                    text: "❌ No Image exist",
                    show_alert: true
                })
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
                answerCallback[chat_id] = "broadcast"
                const button = [
                    ["❌ Cancel"]
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
       console.log(err.message);
    }

}

const onMessage = async (msg) => {
    if(msg.chat.type != "private") return
    try {
        const chat_id = msg.chat.id
        const waitfor = answerCallback[chat_id]
        const message_id = msg.message_id

        if (!answerStore[chat_id]) {
            answerStore[chat_id] = {}
        }

        if (msg.text == "❌ Cancel") {
            answerCallback[chat_id] = null
            chatCallback[chat_id] = null
            const key = await getMainKey(chat_id)
            return await Bot.sendMessage(chat_id, `<i>✖️ Cancelled</i>`, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (chatCallback[chat_id]) {
            const currentOrder = chatCallback[chat_id]
            const msg_id = msg.message_id
            const resData = await customOrdersDB.findOne({ _id: currentOrder })
            answerStore[chat_id].msg_id = msg_id
            const key = [
                [{text: "🚀 Reply", callback_data: `/replymsg ${chat_id}`}],
                [{ text: "🌍 See Location", callback_data: "/seeLocation " + currentOrder },{ text: "💬 Message From", callback_data: "/seeMessageFrom " + chat_id }],
                [{ text: "📃 Product Info", callback_data: "/seeProductInfo " + currentOrder }],
                [{ text: `Status: ${resData.done ? "Status: Sold ✅" : "Not Sold ❌"}`, callback_data: "/mark_sold " + currentOrder }]
            ]
            await Bot.copyMessage(process.env.ADMIN_ID, chat_id, msg_id, {
                reply_markup: {
                    inline_keyboard: key
                }
            })
            return await Bot.sendMessage(chat_id, "✅ Message forwarded: awaiting replay")
        }

        if (waitfor == "add_partners") {
            const forward = msg.forward_from
            if (!forward) {
                return await Bot.sendMessage(chat_id, "✖️ Forward a message from your partner. If this is a forward message ask them to update their privacy settings!")
            }
            const { id, first_name, username, is_bot } = forward
            if (is_bot) {
                return await Bot.sendMessage(chat_id, "✖️ The account looks like a bot account!")
            }
            const user = await partnersDB.findOne({ _id: id })
            answerCallback[chat_id] = null
            if (!user) {
                await partnersDB.create({
                    _id: id,
                    first_name: first_name,
                    username: username
                })
                return await Bot.sendMessage(chat_id, `<i>✅ New partner added</i>`, {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: await getMainKey(chat_id),
                        resize_keyboard: true
                    }
                })
            }
            return await Bot.sendMessage(chat_id, `<i>❌ Partner already exist!</i>`, {
                parse_mode: "HTML"
            })
        }

        if (waitfor == "partner_set_amount") {
            if (!msg.text || isNaN(msg.text)) {
                return await Bot.sendMessage(chat_id, `❌ <i>Enter % from 0.01 to 100</i>`, {
                    parse_mode: "HTML"
                })
            }
            const perc = parseFloat(msg.text).toFixed(2)
            if (perc < 0.01 || perc > 100) {
                return await Bot.sendMessage(chat_id, `❌ <i>Enter % from 0.01 to 100</i>`, {
                    parse_mode: "HTML"
                })
            }
            answerCallback[chat_id] = null
            const [userid, itemid] = answerStore[chat_id]["params"]
            const products = await partnersDB.findOne({_id: userid})
            const commissionList = products.commission
            const toDelete = commissionList.find(item => item.product_id == itemid)
            const obj = {
                product_id: Number(itemid),
                percent: perc
            }
            if (toDelete) {
                await partnersDB.updateOne({ _id: Number(userid) }, {
                    $pull: {
                        commission: toDelete
                    }
                })
            } 
            await partnersDB.updateOne({ _id: Number(userid) }, {
                $push: {
                    commission: obj
                }
            })
            answerStore[chat_id] = {}
            await Bot.sendMessage(chat_id, `✅ Partner amount percentage updated to ${perc}%!`, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
            return await Bot.sendMessage(chat_id, `<i>🔙 Go Back</i>`, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🔙 Back", callback_data: `/partner_spa ${userid}`}
                        ]
                    ]
                }
            })
        }

        if (waitfor == "replymsg_admin") {
            const to = answerStore[chat_id].replymsg
            const msg = answerStore[to].msg_id
            const edit = answerStore[chat_id].replying
            const keys = JSON.parse(answerStore[chat_id].reply_markup)
            keys.shift()
            keys.unshift([{text: "✅ Replied", callback_data: "0"}])
            Bot.editMessageReplyMarkup({
                inline_keyboard: keys
            },{
                chat_id: chat_id,
                message_id: edit
            })
            answerCallback[chat_id] = null
            await Bot.copyMessage(to, chat_id, message_id,{
                reply_to_message_id: msg
            })
            return await Bot.sendMessage(chat_id, "✅ Reply sent!", {
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "enter_custom_location") {
            if (!msg.text) {
                const text = `<i>✖️ Enter location in text message</i>`
                return await Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerCallback[chat_id] = null
            answerStore[chat_id].custom_location = msg.text
            const text1 = `<i>✅ Location: ${msg.text}</i>`
            const key1 = await getMainKey(chat_id)
            await Bot.sendMessage(chat_id, text1, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key1,
                    resize_keyboard: true
                }
            })
            const neighbour = answerStore[chat_id].neighbour
            const products = await customProductDB.find({})
            const key = products.map(item => {
                return [{text: `${item.active ? `✅` : `❌`} ${item.name} 💵 ${item.price} ${item.currency}`, callback_data: `/c_select_product ${item._id}`}]
            })
            const country = answerStore[chat_id].country
            key.push([{ text: "🔙 Back", callback_data: `/c_select_country | ${country}` }])
            return await Bot.sendMessage(chat_id, `<i>Select a product</i>`, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (waitfor === "payout") {
            if (!msg.text || isNaN(msg.text)) {
                const text = `<i>✖️ Enter BTC in numeric value</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const amount = parseFloat(msg.text)
            const user = await userDB.findOne({ _id: chat_id })
            if (amount < botConfig.PAYOUT.MINIMUM || amount > user.balance) {
                const text = `<i>✖️ Minimum ${botConfig.PAYOUT.MINIMUM.toFixed(6)} BTC & Maximum ${user.balance.toFixed(6)} BTC</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerCallback[chat_id] = "payout_wallet"
            answerStore[chat_id].amount = amount
            const text = `<i>📧 Enter USDT ( TRC20 ) address for payout\n\nWe will sent payment in USDT (TRC20)</i>`
            return Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML"
            })
        }

        if (waitfor === "payout_wallet") {
            if (!msg.text) {
                const text = `<i>✖️ Enter valid USDT address</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const address = msg.text
            const amount = answerStore[chat_id].amount
            const resData = await axios.get('https://min-api.cryptocompare.com/data/price', {
                params: {
                    fsym: 'BTC',
                    tsyms: 'USDT',
                },
            });
            const rate = resData.data.USDT
            const inUSDT = parseFloat(amount * rate).toFixed(2)
            answerCallback[chat_id] = null
            await Bot.sendMessage(chat_id, `<i>⌛ Creating payout...</i>`, {
                parse_mode: "HTML"
            })
            const { status: payStatus } = await createPayout(chat_id, address, inUSDT, `${process.env.SERVER}/payout/callback`)
            if (payStatus) {
                await userDB.updateOne({ _id: chat_id }, { $inc: { balance: -(amount) } })
            }
            const text = `✅ Payout Requested\n\n💰 ${inUSDT} USDT ( ${amount} BTC ) to ${address}\n\n🛰️ Status: ${payStatus || "Failed"}`
            const key = await getMainKey(chat_id)
            return await Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "broadcast") {
            answerCallback[chat_id] = null
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

        if (waitfor === "support_message") {
            const admin = process.env.ADMIN_ID
            const message_id = msg.message_id
            await Bot.copyMessage(admin, msg.chat.id, message_id, {
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
            answerCallback[chat_id] = null
            const key = [
                [{text: `Reply to ${msg.chat.username ? `@${msg.chat.username}` : `${msg.chat.first_name}`}`, callback_data:`/replyto ${msg.chat.id}`}]
            ]
            const keys = await getMainKey(chat_id)
            const texts = `<i>✅ Message sent to admin</i>`
            await Bot.sendMessage(chat_id, texts, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: keys,
                    resize_keyboard: true
                }
            })
            const text = `<b>🆘 Support Message\n\n👤 Name: ${msg.chat.username ? `@${msg.chat.username}` : `<a href='tg://user?id=${msg.chat.id}'>${msg.chat.first_name}</a>`}</b>`
            return await Bot.sendMessage(admin, text, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        }

        if (waitfor === "admin_reply") {
            const to = answerStore[chat_id].replyTo
            await Bot.copyMessage(to, chat_id, message_id, {
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
            answerCallback[chat_id] = null
            return Bot.sendMessage(chat_id, "✅ Message sent!")
        }

        if (waitfor === "add_admin_country") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            msg.text.split(",").forEach(async item => {
                await countryDB.create({name: item})
            })
            answerCallback[chat_id] = null
            const text = `✅ Countries added`
            return Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "add_admin_city") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const country = answerStore[chat_id].country

            msg.text.split(",").forEach(async item => {
                await cityDB.create({name: item, country: country})
            })
            answerCallback[chat_id] = null
            const text = `✅ Cities added`
            return Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "add_admin_neighbour") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const city = answerStore[chat_id].city

            msg.text.split(",").forEach(async item => {
                await neighbourhoodDB.create({name: item, city: city})
            })
            answerCallback[chat_id] = null
            const text = `✅ Neighbourhoods added`
            return Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "c_add_admin_neighbour") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const city = answerStore[chat_id].city
            msg.text.split(",").forEach(async item => {
                const param = item.split("|")
                await customNeighbourhoodDB.create({name: param[0], city: city, delivery: parseFloat(param[1])})
            })
            answerCallback[chat_id] = null
            const text = `✅ Neighbourhoods added`
            return Bot.sendMessage(chat_id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: await getMainKey(chat_id),
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "add_product_name") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].name = msg.text
            answerCallback[chat_id] = "add_product_price"
            return await Bot.sendMessage(chat_id, `<i>Enter price in digits (EUR) (Eg: 5)</i>`, {
                parse_mode: "HTML"
            })  
        }

        if (waitfor === "c_add_product_name") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].name = msg.text
            answerCallback[chat_id] = "c_add_product_price"
            return await Bot.sendMessage(chat_id, `<i>Enter price in digits (EUR) (Eg: 5)</i>`, {
                parse_mode: "HTML"
            })  
        }

        if (waitfor === "add_product_price") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            if (isNaN(msg.text)) {
                const text = `<i>✖️ Enter numeric value</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].price = parseFloat(msg.text)
            answerCallback[chat_id] = "add_product_image"
            return await Bot.sendMessage(chat_id, `<i>Send product Image</i>`, {
                parse_mode: "HTML"
            })
        }

        if (waitfor === "c_add_product_price") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            if (isNaN(msg.text)) {
                const text = `<i>✖️ Enter numeric value</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].price = parseFloat(msg.text)
            answerCallback[chat_id] = "c_add_product_image"
            return await Bot.sendMessage(chat_id, `<i>Send product Image</i>`, {
                parse_mode: "HTML"
            })
        }

        if (waitfor === "add_product_image") {
            if (!msg?.photo?.[0]?.file_id) {
                const text = `<i>✖️ Send a valid image or compress the image while send!</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].product_image = msg.photo[0].file_id
            const findDoc = await productDB.findOne().sort({ _id: -1 })
            const key = await getMainKey(chat_id)
            await productDB.create({ _id: findDoc ? findDoc._id + 1 : 1, product_image: answerStore[chat_id].product_image, neighbourhood: answerStore[chat_id].neighbour, currency: "euro", price: answerStore[chat_id].price, name: answerStore[chat_id].name})
            answerCallback[chat_id] = null
            await Bot.sendMessage(chat_id, `✅ Product saved`, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "c_add_product_image") {
            if (!msg?.photo?.[0]?.file_id) {
                const text = `<i>✖️ Send a valid image or compress the image while send!</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            answerStore[chat_id].product_image = msg.photo[0].file_id
            answerCallback[chat_id] = null
            const findDoc = await customProductDB.findOne().sort({ _id: -1 })
            const key = await getMainKey(chat_id)
            await customProductDB.create({ _id: findDoc ? findDoc._id + 1 : 1, product_image: answerStore[chat_id].product_image, currency: "euro", price: answerStore[chat_id].price, name: answerStore[chat_id].name})
            await Bot.sendMessage(chat_id, `✅ Custom Product saved`, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    keyboard: key,
                    resize_keyboard: true
                }
            })
        }

        if (waitfor === "edit_product_name") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const pid = answerStore[chat_id].product_id 
            const ptype = answerStore[chat_id].ptype
            answerCallback[chat_id] = null
            ptype==0 ? await productDB.updateOne({ _id: pid }, { $set: { name: msg.text } }) : await customProductDB.updateOne({ _id: pid }, { $set: { name: msg.text } })
            return await Bot.sendMessage(chat_id, "✅ Name updated", {
                parse_mode: "HTML",
                reply_markup: {
                    resize_keyboard: true,
                    keyboard: await getMainKey(chat_id)
                }
            })
        }

        if (waitfor === "edit_product_price") {
            if (!msg.text) {
                const text = `<i>✖️ Enter text message</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            if (isNaN(msg.text)) {
                const text = `<i>✖️ Enter numeric value</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const pid = answerStore[chat_id].product_id 
            const ptype = answerStore[chat_id].ptype
            answerCallback[chat_id] = null
            ptype==0 ? await productDB.updateOne({ _id: pid }, { $set: { price: parseFloat(msg.text) } }) : await customProductDB.updateOne({ _id: pid }, { $set: { price: parseFloat(msg.text) } })
            return await Bot.sendMessage(chat_id, "✅ Price updated", {
                parse_mode: "HTML",
                reply_markup: {
                    resize_keyboard: true,
                    keyboard: await getMainKey(chat_id)
                }
            })
        }

        if (waitfor === "edit_product_image") {
            if (!msg?.photo?.[0]?.file_id) {
                const text = `<i>✖️ Send a valid image or compress the image while send!</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            const pid = answerStore[chat_id].product_id 
            const ptype = answerStore[chat_id].ptype
            answerCallback[chat_id] = null
            const img = msg.photo[0].file_id
            ptype==0 ? await productDB.updateOne({ _id: pid }, { $set: { product_image: img } }) : await customProductDB.updateOne({ _id: pid }, { $set: { product_image: img } })
            return await Bot.sendMessage(chat_id, "✅ Product image updated", {
                parse_mode: "HTML",
                reply_markup: {
                    resize_keyboard: true,
                    keyboard: await getMainKey(chat_id)
                }
            })
        }

        if (waitfor === "add_product_drop") {
            if (!msg?.photo?.[0]?.file_id) {
                const text = `<i>✖️ Send a valid image or compress the image while send!</i>`
                return Bot.sendMessage(chat_id, text, {
                    parse_mode: "HTML"
                })
            }
            if (!msg.caption) {
                return await Bot.sendMessage(chat_id, "<i>Add caption to image</i>", {
                    parse_mode: "HTML"
                })
            }
            const img = msg.photo?.[0].file_id
            const pid = answerStore[chat_id].product_id 
            const obj = {
                photo: img,
                url: msg.caption,
                added: chat_id
            }
            await productDB.updateOne({ _id: pid }, { $push: { location: obj } })
            await productDB.updateOne({ _id: pid }, { $set: { active: true } })

            return await Bot.sendMessage(chat_id, "✅ Drop updated\n\nSend another drop with location", {
                parse_mode: "HTML",
                reply_markup: {
                    resize_keyboard: true,
                    keyboard: [
                        ["❌ Cancel"]
                    ]
                }
            })
        }

    } catch (err) {
        console.log(err.message);
    }
}

export default {
    start,
    shop,
    custom,
    accountBalance,
    affiliateLink,
    cart,
    preCart,
    customCart,
    orders,
    preOrders,
    customOrders,
    support,
    adminPanel,
    partnerPanel,
    onCallBackQuery,
    onMessage
}