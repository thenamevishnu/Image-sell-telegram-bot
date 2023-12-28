import { Schema, model } from "mongoose";

const cart = new Schema({
    user_id: {
        type: Number
    },
    product_id: {
        type: Number
    },
    qty: {
        type: Number
    }
},{
    timestamps: true
})

export const cartDB = model("carts", cart)