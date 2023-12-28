import mongoose from "mongoose"
import env from "dotenv"

env.config()

export const connect = () => {
    mongoose.connect(process.env.DB_URL).then(() => {
        console.log("Connected DB");
    }).catch(err => {
        console.log("Error", err.message)
    })
}