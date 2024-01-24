import { Schema, model } from "mongoose";

const c_product = new Schema({
    _id: {
        type: Number
    },
    neighbour: {
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
    }
}, {
    timestamps: true
})

export const customProductDB = model("c_products", c_product)