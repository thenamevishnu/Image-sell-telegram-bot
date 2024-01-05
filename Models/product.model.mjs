import { Schema, model } from "mongoose";

const product = new Schema({
    _id: {
        type: Number
    },
    neighbourhood: {
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
    location: [
        {
            photo: {
                type: String
            },
            url: {
                type: String
            }
        }
    ]
}, {
    timestamps: true
})

export const productDB = model("products", product)