"use strict"

const getGrades = require("./get-grades")
const Grade = require("./models/grades")

module.exports = (user, body, done) => {
    return getGrades(body.username, body.password, body.domain, (err, grades) => {
        if (err) {
            return done(null, false)
        }
        Grade.findById(user.grades, (err, gradesInDb) => {
            if (err)
                return done(err)
            if (grades.classes.every((course) => course !== null)) {
                gradesInDb.classes = grades.classes
                gradesInDb.markModified("classes")
                gradesInDb.save(() => {
                    done(null, user)
                })
            } else {
                done(null, user)
            }
        })
    })
}