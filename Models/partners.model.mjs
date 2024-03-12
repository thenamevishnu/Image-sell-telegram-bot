import { Schema, Types, model } from "mongoose";

const partners = new Schema({
    _id: {
        type: Number,
        unique: true
    },
    username: {
        type: String
    },
    first_name: {
        type: String
    },
    removed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

export const partnersDB = model("partners", partners)