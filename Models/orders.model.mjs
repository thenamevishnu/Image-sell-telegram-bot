import { Schema, model } from "mongoose";

const order = new Schema({
    user_id: {
        type: Number
    },
    product_id: {
        type: Number
    },
    qty: {
        type: Number  
    },
    payment: {
        amount: {
            type: Number
        },
        currency: {
            type: String
        },
        orderId: {
            type: Number
        },
        date: {
            type: Number
        },
        trackId: {
            type: Number
        },
        txID: {
            type: String
        }
    }
}, {
    timestamps: true
})

export const orderDB = model("orders", order)