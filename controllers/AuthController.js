import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// eslint-disable-next-line import/no-extraneous-dependencies
const uuid = require('uuidv4');
const crypto = require('crypto');

class AuthController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
  }

  getConnect(req, res) {
    const auth = req.header('Authorization');
    if (!auth) {
      res.status(401).send({ error: 'Unauthorized' });
    } else {
      const buff = Buffer.from(auth.replace('Basic ', ''), 'base64');
      const credentials = buff.toString('utf-8').split(':');
      const email = credentials[0];

      const sha1Hash = crypto.createHash('sha1');
      sha1Hash.update(credentials[1]);
      const password = sha1Hash.digest('hex');

      const user = this.dbClient.findUser({ email, password });

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
