import { Schema, model } from "mongoose";

const c_order = new Schema({
    user_id: {
        type: Number
    },
    product_id: {
        type: Number
    },
    done: {
        type: Boolean,
        default: false
    },
    location: {
        type: String
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

export const customOrdersDB = model("c_orders", c_order)