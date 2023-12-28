import { cartDB } from "../Models/cart.model.mjs"

const cartManage = async (req, res) => {
    try {
        const { product_id, qty, user_id } = req.body
        const cart = await cartDB.find({ user_id: user_id, product_id: product_id })
        if (cart.length==0) {
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
        console.log(err);
        return res.status(500).send({message: "Internal server error"})
    }
}

const deleteItem = async (req, res) => {
    try {
        const { product_id, user_id } = req.params
        await cartDB.deleteOne({ user_id: user_id, product_id: product_id })
        res.status(200).send({status: true, message: "success"})
    } catch (err) {
        console.log(err);
        return res.status(500).send({message: "Internal server error"})
    }
}

export default {
    cartManage,
    deleteItem
}