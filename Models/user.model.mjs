import { Schema, model } from "mongoose";

const user = new Schema({
    _id: {
        type: Number,
        required: true
    },
    first_name: {
        type: String
    },
    username: {
        type: String
    }
},{
    timestamps: true
})

export const userDB = model("users", user)