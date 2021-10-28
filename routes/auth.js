const express = require('express');
const router = express.Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken');
const {SECRET_KEY} = require('../config')
const ExpressError = require('../expressError')

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new ExpressError('Please provide a username and password', 400)
        }
        
        if (await User.authenticate(username, password)) {
            User.updateLoginTimestamp(username)
            const token = jwt.sign({username}, SECRET_KEY)
            return res.json({token})
        }else{
            throw new ExpressError('Invalid Username or Password', 400)
        }
    } catch (err) {
        next(err)
    }
})
/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async (req, res, next) => {
    try {
        const { username, password, first_name, last_name, phone } = req.body
        if (!username || !password || !first_name || !last_name || !phone) {
            throw new ExpressError('Please provide username, password, first_name, last_name and phone', 400)
        }
        await User.register(req.body)
        await User.updateLoginTimestamp(username)
        const token = jwt.sign({ username }, SECRET_KEY)
        return res.json({token})
    } catch (e) {
        next(e)
    }
})

module.exports = router;