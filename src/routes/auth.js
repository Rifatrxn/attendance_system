const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', (req, res, next) => AuthController.register(req, res, next));
router.post('/login', (req, res, next) => AuthController.login(req, res, next));
router.get('/users', (req, res, next) => AuthController.getAllUsers(req, res, next));

// Protected routes
router.get('/me', authenticateToken, (req, res, next) => AuthController.getCurrentUser(req, res, next));
router.post('/logout', authenticateToken, (req, res, next) => AuthController.logout(req, res, next));

module.exports = router;

