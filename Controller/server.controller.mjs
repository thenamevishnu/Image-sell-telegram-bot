const serverStatus = async (req, res) => {
    try {
        res.status(200).send({statusCode: 200, message: "Working"})
    } catch (err) {
        res.status(500).send({statusCode: 500, message: "Internal server error"})
    }
}

export default {serverStatus}