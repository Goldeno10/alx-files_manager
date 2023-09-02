import { Router } from 'express';

const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UserController');

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStates);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UserController.getMe);

router.post('/users', AppController.postNew);
router.post('/files', AppController.postUpload);
