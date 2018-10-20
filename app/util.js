const https = require("https")
const querystring = require("querystring")

module.exports = {

    getValue: function(regEx, string) {
        return string.match(regEx)[0].replace(regEx, "$1")
    },

    get: function(options, cb) {
        const req = https.request({
            method: "GET",
            hostname: options.hostname,
            path: options.path,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                "Cookie": options.cookies ? options.cookies : ""
            }
        }, (res) => {
            res.setEncoding("utf8")
            let rawData = ""
            res.on("data", (chunk) => { rawData += chunk; })
            res.on("end", () => cb(rawData, res))
        })

        req.end()
    },

    post: function(options, postData, cb) {
        const data = querystring.stringify(postData)

        const req = https.request({
            method: "POST",
            hostname: options.hostname,
            path: options.path,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(data),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                "Cookie": options.cookies ? options.cookies : ""
            }
        }, (res) => {
            res.setEncoding("utf8")
            let rawData = ""
            res.on("data", (chunk) => { rawData += chunk; })
            res.on("end", () => cb(rawData, res))
        })
        req.write(data)
        req.end()
    }
}