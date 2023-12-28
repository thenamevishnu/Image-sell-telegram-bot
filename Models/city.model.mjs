import { Schema, model } from "mongoose";

const city = new Schema({
    name: {
        type: String
    },
    country: {
        type: String
    }
}, {
    timestamps: true
})

export const cityDB = model("cities", city)