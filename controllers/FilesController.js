import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const uuid = require('uuidv4');
const fs = require('fs');

class FileController {
  constructor() {
    this.client = dbClient;
    this.redisClient = redisClient;
    this.path = process.env.FILES_PATH || '/tmp/files_manager';
  }

  postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const acceptedFileTypes = ['folder', 'file', 'image'];
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !acceptedFileTypes.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    if (parentId) {
      const parentFile = this.client.findFile({ _id: parentId });
      if (!parentFile) return res.status(400).send({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const file = {
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      };
      const fileCreated = this.client.createFile(file);
      return res.status(201).send(fileCreated);
    }
    const fileName = uuid();
    const filePath = `${this.path}/${fileName}`;
    const buff = Buffer.from(data, 'base64');

    fs.mkdirSync(this.path, { recursive: true });
    fs.writeFileSync(filePath, buff);

    const file = {
      userId,
      name,
      type,
      isPublic: isPublic || false,
      localPath: filePath,
      parentId: parentId || 0,
    };

    const fileCreated = this.client.createFile(file);
    return res.status(201).send(fileCreated);
  }
}

const fileController = new FileController();
module.exports = fileController;
