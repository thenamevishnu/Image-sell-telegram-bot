import { cartDB } from "../Models/cart.model.mjs"
import { customCartDB } from "../Models/custom.cart.model.mjs"

const cartManage = async (req, res) => {
    try {
        const { product_id, qty, user_id } = req.body
        const cart = await cartDB.find({ user_id: user_id, product_id: product_id }) 
        if (cart.length == 0) {
            await cartDB.create({user_id: user_id, product_id: product_id, qty: qty})
        } else {
            if (qty == 0) {
                await cartDB.deleteOne({user_id: user_id, product_id: product_id})
            } else {
                await cartDB.updateOne({
                    user_id: user_id,
                    product_id: product_id
                }, {
                    $set: {
                        qty: qty
                    }
                })
            }
        }
        res.status(200).send({status: true, message: "Updated"})
    } catch (err) {
        return res.status(500).send({message: "Internal server error"})
    }
}

const deleteItem = async (req, res) => {
    try {
        const { product_id, user_id } = req.params
        await cartDB.deleteOne({ user_id: user_id, product_id: product_id })
        res.status(200).send({status: true, message: "success"})
    } catch (err) {
        return res.status(500).send({message: "Internal server error"})
    }
}

const c_cartManage = async (req, res) => {
    try {
        const { product_id, qty, user_id, location, delivery } = req.body
        const cart = await customCartDB.find({ user_id: user_id, product_id: product_id }) 
        if (cart.length == 0) {
            await customCartDB.create({user_id: user_id, product_id: product_id, qty: qty, location: location, delivery: delivery })
        } else {
            if (qty == 0) {
                await customCartDB.deleteOne({user_id: user_id, product_id: product_id})
            } else {
                await customCartDB.updateOne({
                    user_id: user_id,
                    product_id: product_id
                }, {
                    $set: {
                        qty: qty,
                        delivery: delivery,
                        location: location
                    }
                })
            }
        }
        res.status(200).send({status: true, message: "Updated"})
    } catch (err) {
        return res.status(500).send({message: "Internal server error"})
    }
}

const c_deleteItem = async (req, res) => {
    try {
        const { product_id, user_id } = req.params
        await customCartDB.deleteOne({ user_id: user_id, product_id: product_id })
        res.status(200).send({status: true, message: "success"})
    } catch (err) {
        return res.status(500).send({message: "Internal server error"})
    }
}

export default {
    cartManage,
    deleteItem,
    c_cartManage,
    c_deleteItem
}