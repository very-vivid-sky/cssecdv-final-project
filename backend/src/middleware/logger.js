const logger = (req, res, next) => {
    const { method, url } = req

    console.log('\n------ Incoming Request ------')
    console.log(`Method:    ${method}`)
    console.log(`URL:       ${url}`)

    if (method === 'POST') {
        console.log('\n--- Request Body ---')
        console.log(JSON.stringify(req.body, null, 2))
    }

    const originalJson = res.json
    res.json = function(body) {
        console.log('\n--- Response Body ---')
        console.log(JSON.stringify(body, null, 2))
        return originalJson.call(this, body)
    }

    res.on('finish', () => {
        console.log('\n------ Response Sent ------')
        console.log(`Status:    ${res.statusCode}`)
        console.log(`Method:    ${method}`)
        console.log(`URL:       ${url}`)
        console.log('-----------------------------\n')
    })

    next()
}

module.exports = logger
