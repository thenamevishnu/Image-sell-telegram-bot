import { Router } from "express"
import serverController from "../Controller/server.controller.mjs"
import productController from "../Controller/product.controller.mjs"
import paymentController from "../Controller/payment.controller.mjs"

const app = Router()

app.get("/", serverController.serverStatus)
app.post("/cart/create", productController.cartManage)
app.delete("/cart/delete/:product_id/:user_id", productController.deleteItem)
app.post("/payment/callback/:cartId", paymentController.paymentCallback)

export default app