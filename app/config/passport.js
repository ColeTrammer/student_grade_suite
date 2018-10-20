const LocalStrategy = require("passport-local").Strategy
const User = require("../models/user.js")
const Grade = require("../models/grades.js")
const getGrades = require("../get-grades")
const updateGrades = require("../update-grades")
const checkAuth = require("../check-auth");

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
                    return checkAuth.check(username, password, req.body.domain, (valid) => {
                        if (!valid) {
                            req.flash("loginMessage", "Invalid username/password combination")
                            return done(null, false)
                        }
                        setTimeout(() => {
                            getGrades.getAll(username, password, req.body.domain, (err, grades) => {
                                Grade.create(grades, (err, grades) => {
                                    newUser.grades = grades._id
                                    newUser.save(() => {})
                                })
                            })
                        }, 0)
                        return newUser.save(done)
                    })
                }

                if (!user.validPassword(password)) {
                    req.flash("loginMessage", "Wrong password.")
                    return done(null, false)
                }

                if (req.body.update === "on" && req.body.semester.length > 0) {
                    setTimeout(() => {
                        updateGrades.updateSemester(user, req.body, () => {})
                    }, 0)
                    user.updating = true
                    return user.save(done)
                }

                return done(null, user)
            })
        })
    }))
}