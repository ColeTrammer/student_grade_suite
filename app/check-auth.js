const util = require("./util.js")

module.exports = {
    check: function(username, password, domain, done) {
        util.get({
            hostname: domain,
            path: "/Login_Student_PXP.aspx?regenerateSessionId=True",
        }, (rawData, res) => {
            const cookies = res.headers["set-cookie"][0].substring(0, 42)
            util.post({
                hostname: domain,
                path: "/Login_Student_PXP.aspx?regenerateSessionId=True",
                cookies: cookies
            }, {
                __VIEWSTATE: util.getValue(/"__VIEWSTATE" value="(.*)"/g, rawData),
                __VIEWSTATEGENERATOR: util.getValue(/"__VIEWSTATEGENERATOR" value="(.*)"/g, rawData),
                __EVENTVALIDATION: util.getValue(/"__EVENTVALIDATION" value="(.*)"/g, rawData),
                username: username,
                password: password
            }, (rawData, res) => {
                done(!rawData.includes(`<body id="MainBody" onload="document.getElementById('username').focus()">`))
            })
        })
    }
}