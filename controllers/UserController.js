import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const crypto = require('crypto');

class UserController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
  }

  postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    const userExists = this.dbClient.findUser({ email });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    const sha1Hash = crypto.createHash('sha1');
    sha1Hash.update(password);
    const hashedPassword = sha1Hash.digest('hex');
    const user = this.dbClient.createUser({ email, password: hashedPassword });
    return res.status(201).send({ id: user.insertedId, email });
  }

  getMe(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const { email } = this.dbClient.findUser({ _id: userId });

    return res.status(200).send({ id: userId, email });
  }
}

const userController = new UserController();
module.exports = userController;
