/** User class for message.ly */
const db = require('../db')
const ExpressError = require('../expressError')
const bcrypt = require('bcrypt')
const {BCRYPT_WORK_FACTOR, SECRET_KEY} = require('../config')
/** User of the site. */

class User {
  constructor({ username, password, first_name, last_name, phone, join_at, last_login_at }) {
    this.username = username
    this.password = password;
    this.first_name = first_name
    this.last_name = last_name
    this.phone = phone
    this.joinedAt = join_at;
    this.lastLoginAt = last_login_at;

  }
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */
  
  static async register({ username, password, first_name, last_name, phone }) {
      
      const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
      const result= await db.query(`INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
      RETURNING username, password, first_name, last_name, phone`, [username, hashedPassword, first_name, last_name, phone])

      return result.rows[0]
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]);
    const user = result.rows[0]
    if (user) {
      return await bcrypt.compare(password, user.password)
    } else {
      throw new ExpressError(`No user with that username`, 400)
    }
   }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    
     const results =  await db.query(`UPDATE users 
    SET last_login_at= current_timestamp
    WHERE username = $1`,
        [username]);
    if (!results.rows[0]) {
      throw new ExpressError(`user : ${username} not found`, 400)
    }
  }
   

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`SELECT username, first_name, last_name, phone FROM users`)
    return results.rows
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const results = await db.query(`SELECT username, first_name, last_name, phone, join_at, last_login_at FROM users WHERE username = $1`, [username]);
    if (results.rows.length < 1) {
      throw new ExpressError('No user with that username', 400)
    }
    const user = results.rows[0]
    return user
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(`SELECT m.id,
      m.to_username,
      t.first_name AS to_first_name,
      t.last_name AS to_last_name,
      t.phone AS to_phone,
      m.body,
      m.sent_at,
      m.read_at
      FROM messages AS m
      JOIN users AS t ON m.to_username = t.username
      WHERE m.from_username = $1`, [username])
    
    const messages = results.rows[0]
    
    if (!messages) {
      throw new ExpressError(`No messages from user: ${username}`, 404);
    }

    return [{
      id: messages.id,
      to_user: {
        username: messages.to_username,
        first_name: messages.to_first_name,
        last_name: messages.to_last_name,
        phone: messages.to_phone,
      },
      body: messages.body,
      sent_at: messages.sent_at,
      read_at: messages.read_at,
    }];

  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(`SELECT m.id,
      m.from_username,
      f.first_name AS from_first_name,
      f.last_name AS from_last_name,
      f.phone AS from_phone,
      m.body,
      m.sent_at,
      m.read_at
      FROM messages AS m
        JOIN users AS f ON m.from_username = f.username
      WHERE m.to_username = $1`, [username])
    const m = results.rows[0]

    if (!m) {
      throw new ExpressError(`No messages to ${username}`, 404);
    }

    return [{
      id: m.id,
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
      from_user: {
        username: m.from_username,
        first_name: m.from_first_name,
        last_name: m.from_last_name,
        phone: m.from_phone
      }
    }]
  }
}


module.exports = User;