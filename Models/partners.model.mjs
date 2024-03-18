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
    cities: {
        type: Array,
        default: []
    },
    products: {
        type: Array,
        default: []
    },
    commission: [
        {
            product_id: {
                type: Number
            },
            percent: {
                type: Number,
                default: 0
            }
        }
    ]
}, {
    timestamps: true
})

export const partnersDB = model("partners", partners)