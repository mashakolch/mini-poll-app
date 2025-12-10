

const express = require('express');
const router = express.Router();
const {
    getQuestions,
    saveResults,
    getAllResults,
    getResultById,
    deleteResult,
    getStatistics,
    clearResults,
    getServerStatus
} = require('../controllers/surveyController');


router.get('/questions', getQuestions);


router.post('/results', saveResults);


router.get('/results', getAllResults);

router.get('/results/:id', getResultById);

router.delete('/results/:id', deleteResult);


router.get('/statistics', getStatistics);


router.delete('/results', clearResults);

router.get('/status', getServerStatus);

module.exports = router;