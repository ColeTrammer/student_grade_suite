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
            if (!gradesInDb.classes.every((course) => {
                return course.assignments.length === grades.classes.find((c) => course.name === c.name).assignments.length
            }) && grades.classes.every((course) => course !== null)) {
                gradesInDb.classes = gradesInDb.classes.map((course) => {
                    const newGrades = grades.classes.find((c) => course.name === c.name)
                    if (course.assignments.length !== newGrades.assignments.length) {
                        if (!course.previous) {
                            course.previous = []
                        }
                        course.previous.push({
                            total: course.total,
                            date: new Date().getTime()
                        })
                    }
                    course.assignments = newGrades.assignments
                    course.gradeSummary = newGrades.gradeSummary
                    course.total = newGrades.total
                    return course
                })
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