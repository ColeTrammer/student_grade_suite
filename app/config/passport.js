const LocalStrategy = require("passport-local").Strategy
const User = require("../models/user.js")
const Grade = require("../models/grades.js")
const getGrades = require("../get-grades")
const updateGrades = require("../update-grades")

module.exports = (passport) => {
    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    passport.deserializeUser((id, done) => {
        User.findById(id, done)
    })

    passport.use("local", new LocalStrategy({
        passReqToCallback: true
    }, (req, username, password, done) => {
        process.nextTick(() => {
            User.findOne({ username: username }, (err, user) => {
                if (err) {
                    return done(err)
                }

                if (!user) {
                    let newUser = new User()
                    newUser.username = username
                    newUser.password = newUser.generateHash(password)
                    newUser.domain = req.body.domain
                    return getGrades.getAll(username, password, req.body.domain, (err, grades) => {
                        if (err) {
                            req.flash("loginMessage", "Invalid username/password combination")
                            return done(null, false)
                        }
                        Grade.create(grades, (err, grades) => {
                            if (err)
                                return done(err)
                            newUser.grades = grades._id
                            return newUser.save(done)
                        })
                    })
                }

                if (!user.validPassword(password)) {
                    req.flash("loginMessage", "Wrong password.")
                    return done(null, false)
                }

                if (req.body.update === "on" && req.body.semester.length > 0) {
                    return updateGrades.updateSemester(user, req.body, done)
                }

                return done(null, user)
            })
        })
    }))
}