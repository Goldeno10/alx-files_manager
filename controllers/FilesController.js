import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// A media type (also known as a Multipurpose Internet Mail Extensions or MIME type)
const mime = require('mime-types');
const uuid = require('uuidv4');
const fs = require('fs');

class FileController {
  constructor() {
    this.client = dbClient;
    this.redisClient = redisClient;
    this.path = process.env.FILES_PATH || '/tmp/files_manager';
  }

  postUpload(req, res) {
    const userId = this.retrieveUser(req, res);
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

  getShow(req, res) {
    const userId = this.retrieveUser(req, res);

    const { id } = req.params;
    const file = this.client.findFile({ _id: id });

    if (!file) return res.status(404).send({ error: 'Not found' });
    if (file.userId !== userId && !file.isPublic) return res.status(404).send({ error: 'Not found' });

    return res.status(200).send(file);
  }

  getIndex(req, res) {
    this.retrieveUser(req, res);

    const { parentId } = req.query || 0;
    const parentFile = this.client.findFile({ _id: parentId });

    if (parentId && !parentFile) return res.status(200).send([]);
    const page = req.query.page || 0;
    const limit = req.query.limit || 20;
    const files = this.client.findAllFilesPaginated(parentId, page, limit);

    return res.status(200).send(files);
  }

  putPublish(req, res) {
    const userId = this.retrieveUser(req, res);
    const { id } = req.params;
    const file = this.client.findFile({ _id: id });

    if (!file) return res.status(404).send({ error: 'Not found' });
    if (file.userId !== userId) return res.status(404).send({ error: 'Not found' });

    file.isPublic = true;
    this.client.updateFile(id, file);
    return res.status(200).send(file);
  }

  putUnpublish(req, res) {
    const userId = this.retrieveUser(req, res);
    const { id } = req.params;
    const file = this.client.findFile({ _id: id });

    if (!file) return res.status(404).send({ error: 'Not found' });
    if (file.userId !== userId) return res.status(404).send({ error: 'Not found' });

    file.isPublic = false;
    this.client.updateFile(id, file);
    return res.status(200).send({ isPublic: false });
  }

  getFile(req, res) {
    const userId = this.retrieveUser(req, res);
    const { id } = req.params;
    const file = this.client.findFile({ _id: id });

    if (!file) return res.status(404).send({ error: 'Not found' });
    if (file.userId !== userId && !file.isPublic) return res.status(404).send({ error: 'Not found' });

    if (file.type === 'folder') return res.status(400).send({ error: 'A folder doesn\'t have content' });

    const fileContent = fs.readFileSync(file.localPath, { encoding: 'utf-8' });
    const buff = Buffer.from(fileContent);
    const base64data = buff.toString('base64');

    const contentType = mime.lookup(file.name);
    const contentDisposition = `inline; filename=${file.name}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    return res.status(200).send(base64data);
  }

  retrieveUser(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = this.client.findUser({ _id: userId });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    return userId;
  }
}

const fileController = new FileController();
module.exports = fileController;
