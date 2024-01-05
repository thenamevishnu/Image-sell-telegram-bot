import { Schema, Types, model } from "mongoose";

const city = new Schema({
    name: {
        type: String
    },
    country: {
        type: String
    },
    location: {
        type: Types.ObjectId
    }
}, {
    timestamps: true
})

export const cityDB = model("cities", city)