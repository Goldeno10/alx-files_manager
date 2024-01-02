import { MongoClient } from 'mongodb';
// import { promisify } from 'util';

class DBClient {
  constructor() {
    this.init();
  }

  async init() {
    const host = process.env.DB_HOST || '0.0.0.0';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    // const url = 'mongodb://localhost:27017';
    const url = `mongodb://${host}:${port}`;

    this.isActive = this.isActive.bind(this);
    this.nbUsers = this.nbUsers.bind(this);
    this.nbFiles = this.nbFiles.bind(this);
    this.findFile = this.findFile.bind(this);
    this.createFile = this.createFile.bind(this);
    this.findUser = this.findUser.bind(this);
    this.createUser = this.createUser.bind(this);
    this.findAllFilesPaginated = this.findAllFilesPaginated.bind(this);
    this.updateFile = this.updateFile.bind(this);

    try {
      this.client = new MongoClient(url);
      await this.client.connect();
      this.db = this.client.db(database);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.log(error.message);
    }
  }

  isActive() {
    return this.client && this.client.topology.isConnected();
  }

  async nbUsers() {
    const numOfUsers = await this.db.collection('users').countDocuments();
    return numOfUsers;
  }

  async nbFiles() {
    const numOfFiles = await this.db.collection('files').countDocuments();
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

  updateFile(_id, body) {
    return this.db.collection('files')
      .updateOne({ _id }, { $set: body });
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
