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
    product_image: {
        type: String
    },
    location_image: {
        type: String
    },
    location: {
        type: String
    }
}, {
    timestamps: true
})

export const productDB = model("products", product)