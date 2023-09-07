import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const Queue = require('bull');
const thumbnail = require('image-thumbnail');
const fs = require('fs').promises;

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  // Find the file in the database
  const file = dbClient.findFile({ _id: fileId, userId });

  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails
  const originalImagePath = file.localPath;
  const thumbnailOptions = { width: [500, 250, 100] };

  const thumbnails = await thumbnail(originalImagePath, thumbnailOptions);

  // Store each thumbnail with a modified file name
  for (const width of [500, 250, 100]) {
    const thumbnailFileName = `${originalImagePath}_${width}`;
    await fs.writeFile(thumbnailFileName, thumbnails[width]);
  }
  return { success: true };
});

module.exports = fileQueue;
