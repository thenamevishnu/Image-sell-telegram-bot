import { Schema, model } from "mongoose";

const product = new Schema({
    _id: {
        type: Number
    },
    city: {
        type: String
    },
    name: {
        type: String
    },
    weight: {
        type: Number
    },
    currency: {
      type: String  
    },
    price: {
        type: Number
    },
    active: {
        type: Boolean,
        default: true
    },
    image: {
        type: String
    }
}, {
    timestamps: true
})

export const productDB = model("products", product)