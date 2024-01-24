import { Schema, model } from "mongoose";

const c_neighbour = new Schema({
    name: {
        type: String
    },
    delivery: {
        type: Number  
    },
    city: {
        type: String
    }
}, {
    timestamps: true
})

export const customNeighbourhoodDB = model("c_neighbourhoods", c_neighbour)