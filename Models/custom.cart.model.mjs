import { Schema, model } from "mongoose";

const c_cart = new Schema({
    user_id: {
        type: Number
    },
    location: {
        type: String
    },
    delivery: {
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

export const customCartDB = model("c_carts", c_cart)