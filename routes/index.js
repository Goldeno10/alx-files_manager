import { Router } from 'express';

const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UserController');
const FilesController = require('../controllers/FilesController');

const router = Router();

// APP CONTROLLER
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// AUTH CONTROLLER
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

// USER CONTROLLER
router.post('/users', UserController.postNew);
router.get('/users/me', UserController.getMe);

// FILES CONTROLLER
router.get('/files/:id', FilesController.getShow);
router.get('/files/:id/data', FilesController.getFile);
router.post('/files', FilesController.postUpload);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

module.exports = router;
