import { Schema, model } from "mongoose";

const country = new Schema({
    name: {
        type: String
    }
}, {
    timestamps: true
})

export const countryDB = model("countries", country)