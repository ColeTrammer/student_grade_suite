"use strict"

const https = require("https")
const fs = require("fs")
const querystring = require("querystring")
const async = require("async")
const jsdom = require("jsdom")
const { JSDOM } = jsdom

function getValue(regEx, string) {
    return string.match(regEx)[0].replace(regEx, "$1")
}

function get(options, cb) {
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
}

function post(options, postData, cb) {
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

function getListOfSemesters(html, domain, cookies, done) {
    const { document } = new JSDOM(html).window

    let semesters = []
    async.forEachOf(document.querySelectorAll(".heading_breadcrumb li"), (elem, i, cb) => {
        if (i % 2 == 0) {
            if (elem.classList.contains("selected")) {
                semesters.push({
                    name: elem.innerHTML,
                    classes: [],
                    html: html
                })
                cb()
            } else {
                get({
                    hostname: domain,
                    path: "/" + elem.firstElementChild.attributes.href.value,
                    cookies: cookies
                }, (rawData) => {
                    semesters.push({
                        name: elem.firstElementChild.innerHTML,
                        classes: [],
                        html: rawData
                    })
                    cb()
                })
            }
        } else {
            cb()
        }
    }, () => {
        done(semesters)
    })
}

function getListOfClasses(html) {
    const { document } = new JSDOM(html).window

    let classes = []
    document.querySelectorAll(".info_tbl tr").forEach(elem => {
        let link = elem.children.item(1).firstElementChild
        if (link) {
            classes.push({
                path: "/" + link.attributes.href.value,
                name: link.innerHTML,
                period: elem.children.item(0).firstElementChild.innerHTML
            })
        }
    })
    return classes
}

function hasGradeSummary(document) {
    let ans = false
    document.querySelectorAll(".row_hdr").forEach((header) => {
        if (header.innerHTML === "Grade Calculation Summary")
            ans = true
    })
    return ans
}

function getAssignments(html) {
    const { document } = new JSDOM(html).window

    let assignments = []
    const rawAssignments = document.querySelectorAll(".info_tbl").item(hasGradeSummary(document) ? 1 : 0).querySelectorAll("tr")

    for (let i = 2; i < rawAssignments.length - 1; i++) {
        let assignment = { notes: "" }
        rawAssignments.item(i).querySelectorAll("a").forEach((val, i) => {
            switch (i) {
                case 3:
                case 4:
                case 5: break

                case 0: assignment.date = val.innerHTML
                        break
                case 1: assignment.name = val.innerHTML
                        break
                case 2: assignment.type = val.innerHTML
                        break
                case 6: assignment.points = +val.innerHTML.replace(/(.*)\/(.*)/g, "$1") || 0
                        assignment.possible = +val.innerHTML.replace(/(.*)\/(.*)/g, "$2")
                        if (!assignment.possible && assignment.possible !== 0) {
                            assignment.possible = +val.innerHTML.replace(" Points Possible", "")
                            assignment.implicit = true
                        } else {
                            assignment.implicit = false
                        }
                        break
                case 7: assignment.notes = val.innerHTML.replace("&nbsp;", "")
            }
        })
        assignments.push(assignment)
    }

    return assignments
}

function getGradeSummary(html) {
    const { document } = new JSDOM(html).window

    if (!hasGradeSummary(document))
        return "none"

    let summ = []
    const data = document.querySelector(".info_tbl").querySelectorAll("tr")
    for (let i = 1; i < data.length - 1; i++) {
        let subset = {}
        data.item(i).querySelectorAll("td").forEach((val, i) => {
            switch(i) {
                case 0: subset.name = val.innerHTML
                        break
                case 1: subset.weight = +val.innerHTML.replace("%", "")
                        break
                case 2: subset.points = +val.innerHTML
                        break
                case 3: subset.possible = +val.innerHTML
                        break
            }
        })
        summ.push(subset)
    }
    return summ
}

module.exports = (username, password, domain, done) => {
    get({
        hostname: domain,
        path: "/Login_Student_PXP.aspx?regenerateSessionId=True",
    }, (rawData, res) => {
        const cookies = res.headers["set-cookie"][0].substring(0, 42)
        post({
            hostname: domain,
            path: "/Login_Student_PXP.aspx?regenerateSessionId=True",
            cookies: cookies
        }, {
            __VIEWSTATE: getValue(/"__VIEWSTATE" value="(.*)"/g, rawData),
            __VIEWSTATEGENERATOR: getValue(/"__VIEWSTATEGENERATOR" value="(.*)"/g, rawData),
            __EVENTVALIDATION: getValue(/"__EVENTVALIDATION" value="(.*)"/g, rawData),
            username: username,
            password: password
        }, (rawData, res) => {
            get({
                hostname: domain,
                path: "/PXP_Gradebook.aspx?AGU=0",
                cookies: cookies
            }, (rawData, res) => {
                getListOfSemesters(rawData, domain, cookies, (semesters) => {
                    let grades = {
                        semesters: [],
                        username: username,
                        cookies: cookies,
                        assignmentsKeyMap: [
                            {
                                key: "name",
                                display: "Name"
                            },
                            {
                                key: "type",
                                display: "Type"
                            },                    
                            {
                                key: "points",
                                display: "Points"
                            },
                            {
                                key: "possible",
                                display: "Points Possible"
                            },
                            {
                                key: "percent",
                                display: "%"
                            },
                            {
                                key: "weightedPercent",
                                display: "% Earned"
                            },
                            {
                                key: "weight",
                                display: "% Worth"
                            },
                            {
                                key: "grade",
                                display: "Grade"
                            }
                        ],
                        gradeSummaryKeyMap: [
                            {
                                key: "name",
                                display: "Name"
                            },
                            {
                                key: "points",
                                display: "Points"
                            },
                            {
                                key: "possible",
                                display: "Points Possible"
                            },
                            {
                                key: "percent",
                                display: "%"
                            },
                            {
                                key: "weightedPercent",
                                display: "% Earned"
                            },
                            {
                                key: "weight",
                                display: "% Worth"
                            },
                            {
                                key: "grade",
                                display: "Grade"
                            }
                        ],
                        totalsKeyMap: [
                            {
                                key: "points",
                                display: "Points"
                            },
                            {
                                key: "possible",
                                display: "Points Possible"
                            },
                            {
                                key: "percent",
                                display: "%"
                            },
                            {
                                key: "grade",
                                display: "Grade"
                            }
                        ]
                    }
                    async.each(semesters, (semester, cb1) => {
                        const classes = getListOfClasses(semester.html)
    
                        async.each(classes, (class_, cb2) => {
                            get({
                                hostname: domain,
                                path: class_.path,
                                cookies: cookies
                            }, (rawData) => {
                                semester.classes.push({
                                    name: class_.name,
                                    period: class_.period,
                                    assignments: getAssignments(rawData),
                                    gradeSummary: getGradeSummary(rawData)
                                })
                                cb2()
                            })
                        }, () => {
                            grades.semesters.push({
                                name: semester.name,
                                classes: semester.classes
                            })
                            cb1()
                        })
                    }, () => {
                        if (!grades.semesters.length) {
                            return done({ error: "No semesters" })
                        }
                        done(null, grades)
                    })
                })
            })
        })
    })
}