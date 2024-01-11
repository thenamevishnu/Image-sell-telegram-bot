import { Schema, model } from "mongoose";

const solds = new Schema({
    user_id: {
        type: String  
    },
    qty: {
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
    product_image: {
        type: String
    },
    location: {
        photo: {
            type: String
        },
        url: {
            type: String
        }
    }
}, {
    timestamps: true
})

export const soldDB = model("solds", solds)