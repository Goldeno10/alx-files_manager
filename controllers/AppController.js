// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';

import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
  }

  getStatus(req, res) {
    res.status(200).send({ redis: 'a house', db: 'a boy' });
    // if (this.dbClient.isActive() && this.redisClient.isAlive()) {
    //   res.status(200).send({ redis: true, db: true });
    // } else {
    //   res.status(200).send({ redis: false, db: false });
    // }
    console.log(this);
  }

  getStats(req, res) {
    const users = this.dbClient.nbUsers();
    const files = this.dbClient.nbFiles();
    res.status(200).send({ users, files });
  }
}

const appController = new AppController();
module.exports = appController;
