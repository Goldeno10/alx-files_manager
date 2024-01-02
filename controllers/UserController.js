// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';

const crypto = require('crypto');

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UserController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
    this.postNew = this.postNew.bind(this);
    this.getMe = this.getMe.bind(this);
  }

  /*
  * POST /users => Create a new user in DB
  * REQUEST BODY = {
  *  "email": " email ",
  * "password": " password "
  * }
  * curl -X POST -H "Content-Type: application/json" -d '{ "email": " email ", "password": " password " }' http://localhost:5000/users
  * IF SUCESS:
  * RESPONSE = {
  *  "id": " user_id ",
  * "email": " user_email "
  * }
  * RESPONSE STATUS = 201
  * ELSE:
  * RESPONSE = {
  * "error": "Missing email",
  * "error": "Missing password",
  * "error": "Already exist"
  * }
  */
  async postNew(req, res) {
    const { email, password } = req.body;
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail) return res.status(400).send({ error: 'Missing email' });
    if (!trimmedPassword) return res.status(400).send({ error: 'Missing password' });
    const userExists = await this.dbClient.findUser({ trimmedEmail });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    const sha1Hash = crypto.createHash('sha1');
    sha1Hash.update(trimmedPassword);
    const hashedPassword = sha1Hash.digest('hex');
    const user = await this.dbClient.createUser({ email: trimmedEmail, password: hashedPassword });
    return res.status(201).send({ id: user.insertedId, trimmedEmail });
  }

  /*
  * GET /users/me => Get the user currently connected
  * REQUEST HEADER = {
  * "X-Token": " token "
  * }
  * curl -X GET -H "X-Token: token" http://localhost:5000/users/me
  * IF SUCESS:
  * RESPONSE = {
  * "id": " user_id ",
  * "email": " user_email "
  * }
  * RESPONSE STATUS = 200
  * ELSE:
  * RESPONSE = {
  * "error": "Unauthorized"
  * }
  * RESPONSE STATUS = 401
  */
  async getMe(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    // Create a new ObjectId based on the provided userId
    const userIdObj = new ObjectId(userId);
    const user = await this.dbClient.findUser({ _id: userIdObj });
    if (!user) return res.status(401).send({ error: 'User not found' });
    const { email } = user;
    return res.status(200).send({ id: userId, email });
  }
}

const userController = new UserController();
module.exports = userController;
