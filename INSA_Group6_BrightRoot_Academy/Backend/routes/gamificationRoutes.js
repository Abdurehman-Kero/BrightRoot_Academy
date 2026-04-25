const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getProfile, getLeaderboard, getChallenges, getAllBadges, claimLoginXP } = require('../controllers/gamificationController');

router.use(authenticateToken);

router.get('/profile/', getProfile);
router.get('/leaderboard/', getLeaderboard);
router.get('/challenges/', getChallenges);
router.get('/badges/', getAllBadges);
router.post('/login-xp/', claimLoginXP);

module.exports = router;
