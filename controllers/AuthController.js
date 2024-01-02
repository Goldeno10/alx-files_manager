// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';

// eslint-disable-next-line import/no-extraneous-dependencies
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
    this.getConnect = this.getConnect.bind(this);
    this.getDisconnect = this.getDisconnect.bind(this);
  }

  /*
  * Basic Auth
  * 1 - Get the Authorization header from the request
  * 2 - If Authorization header is not present, return 401
  * 3 - Decode the base64 Authorization header
  * 4 - Extract the email and password from the decoded header
  * 5 - Hash the password using sha1
  * 6 - Search the user in the database by email and password
  * 7 - If the user is not found
  * 8 - return 401 status code and { "error": "Unauthorized" }
  * 9 - Else
  * 10 - Generate a random token using uuidv4()
  * 11 - Create a key-value pair in Redis where key is the generated token
  * 12 - The value is the _id of the user from the database
  * 13 - Set the time to live for the key to 24 hours
  * REQUEST BODY = {
  *   "email": " email ",
  *   "password": " password "
  * }
  * curl -X GET -H "Authorization: Basic BASE64_ENCODED_CREDENTIALS" \ email:password http://localhost:5000/connect
  * BASE64_ENCODED_CREDENTIALS = echo -n email:password | base64
  * IF SUCCESS:
  * RESPONSE BODY = {
  *   token: " token ";
  * }
  * RESPONSE STATUS = 200
  * ELSE
  * RESPONSE BODY {
  *   "error": "Unauthorized";
  * }
  * RESPONSE STATUS = 401
  */
  async getConnect(req, res) {
    const auth = req.header('Authorization');
    if (!auth) {
      res.status(401).send({ error: 'Unauthorized' });
    } else {
      const buff = Buffer.from(auth.replace('Basic ', ''), 'base64');
      const credentials = buff.toString('utf-8').split(':');
      const email = credentials[0].trim();

      const sha1Hash = crypto.createHash('sha1');
      sha1Hash.update(credentials[1].trim());
      const password = sha1Hash.digest('hex');

      const user = await this.dbClient.findUser({ email, password });
      if (user) {
        const token = uuid();
        const key = `auth_${token}`;

        this.redisClient.set(key, user._id.toString(), 86400);

        res.status(200).send({ token });
      } else {
        res.status(401).send({ error: 'Unauthorized' });
      }
    }
  }

  /*
  * Disconnect
  * 1 - Get the X-Token header from the request
  * 2 - If X-Token header is not present, return 401
  * 3 - Search the key in Redis
  * 4 - If the key is not found, return 401
  * 5 - Delete the key from Redis
  * 6 - Return 204 status code
  * curl -X GET -H "X-Token: token" http://localhost:5000/disconnect
  * REQUEST BODY = {
  *   "X-Token": " token "
  * }
  * RESPONSE BODY = {}
  */
  getDisconnect(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    this.redisClient.del(key);
    return res.status(204).send();
  }
}

const authController = new AuthController();
module.exports = authController;
