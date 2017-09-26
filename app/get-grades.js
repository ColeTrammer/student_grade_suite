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
                case 2: subset.points = 0
                        break
                case 3: subset.possible = 0
                        break
            }
        })
        summ.push(subset)
    }
    return summ
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

function processGrade(grade) {
    function getLetterGrade(percent) {
        return "ABCDFFFFFF".charAt(4 - Math.floor((percent - 50) / 10)) || "A";
    }

    function roundPercent(dec) {
        return Math.round(dec * 100000) / 1000;
    }

    if (grade.gradeSummary === "none" || grade.gradeSummary.every(function (s) {
        return s.implicit;
    })) {
        var categoryMap = {};
        var totals = [0, 0];
        grade.assignments.forEach(function (assignment) {
            if (!assignment.hidden || assignment.hidden.includes(">False<")) {
                if (categoryMap[assignment.type]) {
                    categoryMap[assignment.type].points += assignment.points;
                    categoryMap[assignment.type].possible += assignment.possible;
                } else {
                    categoryMap[assignment.type] = {
                        points: assignment.points,
                        possible: assignment.possible
                    };
                }
                totals[0] += assignment.points;
                totals[1] += assignment.possible;
            }
        });
        grade.total = {
            points: totals[0],
            possible: totals[1],
            percent: roundPercent(totals[0] / totals[1]),
            grade: getLetterGrade(totals[0] / totals[1] * 100)
        };
    } else {
        grade.gradeSummary = grade.gradeSummary.map(function (subset) {
            subset.points = 0;
            subset.possible = 0;
            return subset;
        });
        grade.assignments.forEach(function (assignment) {
                var subset = grade.gradeSummary.find(function (s) {
                    return s.name === assignment.type;
                });
                subset.points += assignment.points;
                subset.possible += assignment.possible;
        });
        var totals = [0, 0, 0, 0];
        grade.gradeSummary = grade.gradeSummary.map(function (subset) {
            if (subset.possible !== 0) {
                subset.percent = roundPercent(subset.points / subset.possible);
                subset.weightedPercent = roundPercent(subset.weight * subset.percent / 10000);
                subset.grade = getLetterGrade(subset.percent);
                subset.implicit = false;
                totals[0] += subset.points;
                totals[1] += subset.possible;
                totals[2] += subset.weightedPercent;
                totals[3] += subset.weight;
            }

            return subset;
        });
        grade.total = {
            points: totals[0],
            possible: totals[1],
            percent: roundPercent(totals[2] / totals[3]),
            grade: getLetterGrade(totals[2] / totals[3] * 100)
        };
    }
    return grade;
}

function processGrades(grades) {
    grades.classes = grades.classes.map(processGrade);
    return grades
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
                const classes = getListOfClasses(rawData)

                let grades = {
                    classes: [],
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
                async.each(classes, (class_, cb) => {
                    get({
                        hostname: domain,
                        path: class_.path,
                        cookies: cookies
                    }, (rawData) => {
                        grades.classes.push({
                            name: class_.name,
                            period: class_.period,
                            assignments: getAssignments(rawData),
                            gradeSummary: getGradeSummary(rawData)
                        })
                        cb()
                    })
                }, () => {
                    if (!grades.classes.length) {
                        return done({ error: "No classes" })
                    }
                    done(null, processGrades(grades))
                })
            })
        })
    })
}