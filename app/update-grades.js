"use strict"

const getGrades = require("./get-grades")
const Grade = require("./models/grades")

module.exports = (user, body, done) => {
    return getGrades(body.username, body.password, body.domain, (err, grades) => {
        if (err) {
            return done(null, false)
        }
        Grade.findByIdAndUpdate(user.grades, grades, () => {
            if (err)
                return done(err)
            done(null, user)
        })
    })
}