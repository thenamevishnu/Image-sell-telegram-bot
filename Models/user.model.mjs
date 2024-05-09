import { Schema, model } from "mongoose";

const user = new Schema({
    _id: {
        type: Number,
        required: true
    },
    first_name: {
        type: String
    },
    username: {
        type: String
    },
    inviter: {
        type: Number,
        default: 0
    },
    invites: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    inUSD: {
        type: Number,
        default: 0
    }
},{
    timestamps: true
})

export const userDB = model("users", user)