"use strict"

const getGrades = require("./get-grades")
const Grade = require("./models/grades")

module.exports.updateAll = (user, body, done) => {
    return getGrades.getAll(body.username, body.password, body.domain, (err, grades) => {
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

module.exports.updateSemester = (user, body, done) => {
    return Grade.findById(user.grades, (err, grades) => {
        if (err)
            return done(err)
        if (!grades)
            return done({ err: "no grades" })
        const semesterToUpdate = grades.semesters.find(_semester => _semester.path === body.semester)
        if (semesterToUpdate) {
            getGrades.getSemester(body.username, body.password, body.domain, body.semester, (err, semester) => {
                if (err)
                    return done(err)
                semesterToUpdate.classes = semester.classes
                grades.markModified("semesters")
                grades.save((err) => {
                    if (err)
                        return done(err)
                    done(null, user)
                })
            })
        } else {
            return done(null, user)
        }
    })
}