// A media type (also known as a Multipurpose Internet Mail Extensions or MIME type)
const mime = require('mime-types');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const path = require('path');

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const fileQueue = require('../worker');

// const Queue = require('bull');

// const fileQueue = new Queue('fileQueue');

class FileController {
  constructor() {
    this.client = dbClient;
    this.redisClient = redisClient;
    this.path = process.env.FILES_PATH || '/tmp/files_manager';

    this.postUpload = this.postUpload.bind(this);
    this.getShow = this.getShow.bind(this);
    this.getIndex = this.getIndex.bind(this);
    this.putPublish = this.putPublish.bind(this);
    this.putUnpublish = this.putUnpublish.bind(this);
    this.getFile = this.getFile.bind(this);
    this.retrieveUser = this.retrieveUser.bind(this);
  }

  /*
  * POST /users/:id/files
  * REQUEST BODY = {
  *  "name": " file_name ",
  * "type": " file_type ",
  * "isPublic": " true or false ",
  * "parentId": " parent_id ",
  * "data": " file_data "
  * }
  * curl -X POST -H "X-Token: token" -H "Content-Type: application/json" \
  *   -d '{ "name": " file_name ", "type": " file_type ",
  *        "isPublic": " true or false ", "parentId": " parent_id ",
  *         "data": " file_data " }' http://localhost:5000/files
  * IF SUCCESS:
  * RESPONSE = {
  * "id": " file_id ",
  * "userId": " user_id ",
  * "name": " file_name ",
  * "type": " file_type ",
  * "isPublic": " true or false ",
  * "parentId": " parent_id "
  * }
  * RESPONSE STATUS = 201
  * ELSE:
  * RESPONSE = {
  * "error": " Missing name "
  * "error": " Missing type "
  * "error": " Missing data "
  * "error": " Parent not found "
  * "error": " Parent is not a folder "
  * }
  * RESPONSE STATUS = 400
  */
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
    const uploadsPath = path.join(__dirname, 'uploads');

    const filePath = path.join(uploadsPath, fileName);
    const buff = Buffer.from(data, 'base64');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
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

    if (type === 'image') {
      fileQueue.add({
        userId,
        fileId: fileCreated._id,
      });
    }
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

    const { size } = req.query;
    let filePath;

    if (size) {
      filePath = `${this.path}/${id}_${size}`;
    } else {
      filePath = file.localPath;
    }
    try {
      fs.accessSync(filePath);
      const fileContent = fs.readFileSync(filePath);
      const contentType = mime.lookup(file.name);
      const contentDisposition = `inline; filename=${file.name}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);

      return res.status(200).send(fileContent);
    } catch (error) {
      return res.status(404).send({ error: 'Not found' });
    }
  }

  retrieveUser(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = this.redisClient.get(key);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = this.client.findUser({ _id: userId });
    if (!user) return res.status(401).send({ error: 'User not found' });
    return userId;
  }
}

const fileController = new FileController();
module.exports = fileController;
