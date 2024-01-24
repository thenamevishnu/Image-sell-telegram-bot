import { Router } from "express"
import serverController from "../Controller/server.controller.mjs"
import productController from "../Controller/product.controller.mjs"
import paymentController from "../Controller/payment.controller.mjs"

const app = Router()

app.get("/", serverController.serverStatus)
app.post("/cart/create", productController.cartManage)
app.delete("/cart/delete/:product_id/:user_id", productController.deleteItem)
app.post("/cart/custom/create", productController.c_cartManage)
app.delete("/cart/custom/delete/:product_id/:user_id", productController.c_deleteItem)

app.post("/payment/callback/:cartId", paymentController.paymentCallback)
app.post("/payment/custom/callback/:cartId", paymentController.customPaymentCallback)
app.post("/payout/callback", paymentController.payoutCallback)

export default app