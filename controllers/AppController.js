import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  constructor() {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
    this.getStatus = this.getStatus.bind(this);
    this.getStats = this.getStats.bind(this);
  }

  /*
  * GET /status => Check the status of the API
  * IF SUCESS:
  * Return: {"redis":true,"db":true}
  * ELSE:
  * Return: {"redis":false,"db":false}
  * curl -X GET http://localhost:5000/status
  */
  getStatus(req, res) {
    if (this.dbClient.isActive() && this.redisClient.isAlive()) {
      res.status(200).send({ redis: true, db: true });
    } else {
      res.status(200).send({ redis: false, db: false });
    }
  }

  /*
  * GET /stats => Get stats of the API
  * IF SUCESS:
  * Return: {"users": 12, "files": 123}
  * ELSE:
  * Return: {"users": 0, "files": 0}
  * curl -X GET http://localhost:5000/stats
  */
  async getStats(req, res) {
    try {
      const users = await this.dbClient.nbUsers();
      const files = await this.dbClient.nbFiles();
      res.status(200).send({ users, files });
    } catch (error) {
      res.status(200).send({ users: 0, files: 0, error: 'Cannot load stats' });
    }
  }
}

const appController = new AppController();
module.exports = appController;
