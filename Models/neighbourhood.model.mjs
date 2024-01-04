import { Schema, model } from "mongoose";

const neighbour = new Schema({
    name: {
        type: String
    },
    city: {
        type: String
    }
}, {
    timestamps: true
})

export const neighbourhoodDB = model("neighbourhoods", neighbour)