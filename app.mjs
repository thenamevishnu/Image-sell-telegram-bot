import express, { response } from "express"
import env from "dotenv"
// import cron from "node-cron"
// import axios from "axios"
import serverRoute from "./Routes/server.route.mjs"
import "./Telegram/Index.mjs"
import * as db from "./Database/Connection.mjs"
import { productDB } from "./Models/product.model.mjs"

env.config()
db.connect()

const app = express()

// cron.schedule("* * * * *", () => {
//     axios.get(process.env.SERVER).then(({data: response}) => {
//         console.log(response)
//     }).catch(err => {
//         console.log(err.message)
//     })
// })

app.use(express.json())
app.use("/", serverRoute)

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started");
})