import { Schema, model } from "mongoose";

const payout = new Schema({
    user_id: {
        type: Number  
    },
    amount: {
        type: Number
    },
    address: {
        type: String  
    },
    currency: {
        type: String
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
}, {
    timestamps: true
})

export const payoutDB = model("payouts", payout)