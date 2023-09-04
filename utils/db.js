import { MongoClient } from 'mongodb';
import { promisify } from 'util';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url);
    this.db = this.client.db(database);
    this.client.connect();

    this.nbUsers = promisify(this.db.collection('users').countDocuments).bind(this.db.collection('users'));
    this.findUser = promisify(this.db.collection('users').findOne).bind(this.db.collection('users'));
    this.nbFiles = promisify(this.db.collection('files').countDocuments).bind(this.db.collection('files'));
    this.findFile = promisify(this.db.collection('files').findOne).bind(this.db.collection('files'));
    this.createFile = promisify(this.db.collection('files').insertOne).bind(this.db.collection('files'));
  }

  isActive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const numOfUsers = await this.nbUsers();
    return numOfUsers;
  }

  async nbFiles() {
    const numOfFiles = await this.nbFiles();
    return numOfFiles;
  }

  async findFile(file) {
    const fileFound = await this.db.collection('files').find(file);
    return fileFound;
  }

  async createFile(file) {
    const fileCreated = await this.db.collection('files').insertOne(file);
    return fileCreated;
  }

  async findUser(user) {
    const userFound = await this.db.collection('users').findOne(user);
    return userFound;
  }

  async createUser(user) {
    const userCreated = await this.db.collection('users').insertOne(user);
    return userCreated;
  }

  findAllFilesPaginated(parentId, page, lim) {
    return this.db.collection('files')
      .aggregate([
        {
          $match: {
            parentId,
          },
        },
        { $skip: (page - 1) * lim },
        { $limit: lim },
      ]);
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
