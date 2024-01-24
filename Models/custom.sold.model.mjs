import { Schema, model } from "mongoose";

const c_solds = new Schema({
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
        type: String
    }
}, {
    timestamps: true
})

export const customSoldDB = model("c_solds", c_solds)