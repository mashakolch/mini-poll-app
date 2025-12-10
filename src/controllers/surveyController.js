
let surveyResults = [];
let nextId = 1;


const getQuestions = (req, res) => {
    try {
        const questions = require('../data/surveyQuestions');
        

        const limit = parseInt(req.query.limit) || questions.length;
        const filteredQuestions = questions.slice(0, limit);
        
        res.json({
            success: true,
            questions: filteredQuestions,
            totalQuestions: questions.length,
            returnedQuestions: filteredQuestions.length
        });
    } catch (error) {
        console.error('Ошибка при получении вопросов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при получении вопросов'
        });
    }
};


const saveResults = (req, res) => {
    try {
        const { name, answers } = req.body;
        
        console.log('Получены данные для сохранения:', { 
            name: name ? `${name.substring(0, 20)}...` : 'не указано',
            answersCount: answers ? answers.length : 0
        });
        
       
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ 
                success: false,
                error: 'Имя должно содержать минимум 2 символа' 
            });
        }
      
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ 
                success: false,
                error: 'Ответы должны быть в виде массива' 
            });
        }
        
        const questions = require('../data/surveyQuestions');
       
        if (answers.length !== questions.length) {
            return res.status(400).json({ 
                success: false,
                error: `Необходимо ответить на все ${questions.length} вопросов. Получено ответов: ${answers.length}` 
            });
        }
        
       
        const validationErrors = [];
        
        for (let i = 0; i < answers.length; i++) {
            const question = questions[i];
            const answer = answers[i];
            const questionNumber = i + 1;
            
           
            if (answer === undefined || answer === null || answer === '') {
                validationErrors.push(`Вопрос ${questionNumber}: не выбран вариант ответа`);
                continue;
            }
            
           
            if (question.type === 'radio' || question.type === 'select') {
                if (!question.options.includes(answer)) {
                    validationErrors.push(`Вопрос ${questionNumber}: выбран недопустимый вариант`);
                }
            }
       
            else if (question.type === 'checkbox') {
                if (!Array.isArray(answer)) {
                    validationErrors.push(`Вопрос ${questionNumber}: для этого вопроса нужно выбрать несколько вариантов`);
                } else if (answer.length === 0) {
                    validationErrors.push(`Вопрос ${questionNumber}: выберите хотя бы один вариант`);
                } else {
                  
                    for (const selectedOption of answer) {
                        if (!question.options.includes(selectedOption)) {
                            validationErrors.push(`Вопрос ${questionNumber}: выбран недопустимый вариант: "${selectedOption}"`);
                            break;
                        }
                    }
                }
            }
            
           
            else if (question.type === 'range') {
                const num = parseInt(answer);
                if (isNaN(num)) {
                    validationErrors.push(`Вопрос ${questionNumber}: введите числовое значение`);
                } else if (num < question.min || num > question.max) {
                    validationErrors.push(`Вопрос ${questionNumber}: значение должно быть от ${question.min} до ${question.max}`);
                }
            }
        }
        
   
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: validationErrors[0], 
                errors: validationErrors  
            });
        }
        
      
        const result = {
            id: nextId++,
            name: name.trim(),
            answers: answers,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress || 'unknown'
        };
        
        surveyResults.push(result);
        
        console.log(`Результат сохранен: ID=${result.id}, Имя=${result.name}`);
        
       
        res.status(201).json({
            success: true,
            message: 'Результаты успешно сохранены!',
            resultId: result.id,
            totalResults: surveyResults.length,
            timestamp: result.timestamp
        });
        
    } catch (error) {
        console.error('Ошибка при сохранении результатов:', error);
        res.status(500).json({ 
            success: false,
            error: 'Внутренняя ошибка сервера при сохранении данных'
        });
    }
};


const getAllResults = (req, res) => {
    try {
       
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const sort = req.query.sort || 'newest'; 
        
        
        let results = [...surveyResults];
        
       
        if (sort === 'newest') {
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (sort === 'oldest') {
            results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        
        const paginatedResults = results.slice(offset, offset + limit);
        

        const safeResults = paginatedResults.map(({ ip, ...rest }) => rest);
        
        res.json({
            success: true,
            results: safeResults,
            pagination: {
                total: results.length,
                limit: limit,
                offset: offset,
                hasMore: offset + limit < results.length
            },
            sort: sort
        });
    } catch (error) {
        console.error('Ошибка при получении результатов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при получении результатов'
        });
    }
};

const getResultById = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Некорректный ID результата'
            });
        }
        
        const result = surveyResults.find(r => r.id === id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: `Результат с ID ${id} не найден`
            });
        }
        
        
        const { ip, ...safeResult } = result;
        
        res.json({
            success: true,
            result: safeResult
        });
    } catch (error) {
        console.error('Ошибка при получении результата по ID:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при получении результата'
        });
    }
};

// Удалить результат по ID
const deleteResult = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Некорректный ID результата'
            });
        }
        
        const index = surveyResults.findIndex(r => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: `Результат с ID ${id} не найден`
            });
        }
        
        const deletedResult = surveyResults.splice(index, 1)[0];
        
        console.log(`Результат удален: ID=${deletedResult.id}`);
        
        res.json({
            success: true,
            message: 'Результат успешно удален',
            deletedId: deletedResult.id,
            totalResults: surveyResults.length
        });
    } catch (error) {
        console.error('Ошибка при удалении результата:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при удалении результата'
        });
    }
};

// Получить статистику
const getStatistics = (req, res) => {
    try {
        const questions = require('../data/surveyQuestions');
        const stats = {
            success: true,
            totalParticipants: surveyResults.length,
            questions: [],
            lastSubmission: surveyResults.length > 0 
                ? surveyResults[surveyResults.length - 1].timestamp 
                : null
        };
        
        // Для каждого вопроса рассчитываем статистику
        questions.forEach((question, questionIndex) => {
            const questionStats = {
                question: question.question,
                type: question.type,
                questionNumber: questionIndex + 1
            };
            
            if (question.type === 'radio' || question.type === 'select') {
                // Подсчет для вопросов с одним вариантом ответа
                const counts = {};
                const percentages = {};
                
                // Инициализируем все варианты с нулями
                question.options.forEach(option => {
                    counts[option] = 0;
                });
                
                surveyResults.forEach(result => {
                    const answer = result.answers[questionIndex];
                    if (counts[answer] !== undefined) {
                        counts[answer]++;
                    }
                });
                
                Object.keys(counts).forEach(option => {
                    percentages[option] = stats.totalParticipants > 0 
                        ? Math.round((counts[option] / stats.totalParticipants) * 100) 
                        : 0;
                });
                
                questionStats.counts = counts;
                questionStats.percentages = percentages;
                
                let maxCount = 0;
                let mostPopular = null;
                Object.entries(counts).forEach(([option, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        mostPopular = option;
                    }
                });
                
                questionStats.mostPopular = mostPopular;
                questionStats.mostPopularCount = maxCount;
            }
            
            else if (question.type === 'checkbox') {
                const counts = {};
                const percentages = {};
                
                question.options.forEach(option => {
                    counts[option] = 0;
                });
                
                surveyResults.forEach(result => {
                    const answers = result.answers[questionIndex];
                    if (Array.isArray(answers)) {
                        answers.forEach(answer => {
                            if (counts[answer] !== undefined) {
                                counts[answer]++;
                            }
                        });
                    }
                });
                
               
                Object.keys(counts).forEach(option => {
                    percentages[option] = stats.totalParticipants > 0 
                        ? Math.round((counts[option] / stats.totalParticipants) * 100) 
                        : 0;
                });
                
                questionStats.counts = counts;
                questionStats.percentages = percentages;
             
                let maxCount = 0;
                let mostPopular = null;
                Object.entries(counts).forEach(([option, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        mostPopular = option;
                    }
                });
                
                questionStats.mostPopular = mostPopular;
                questionStats.mostPopularCount = maxCount;
            }
            
            else if (question.type === 'range') {
                
                const values = surveyResults
                    .map(result => {
                        const val = parseInt(result.answers[questionIndex]);
                        return isNaN(val) ? null : val;
                    })
                    .filter(val => val !== null);
                
                if (values.length > 0) {
                    const sum = values.reduce((a, b) => a + b, 0);
                    questionStats.average = (sum / values.length).toFixed(2);
                    questionStats.min = Math.min(...values);
                    questionStats.max = Math.max(...values);
                    questionStats.totalResponses = values.length;
                    
                
                    const distribution = {};
                    for (let i = question.min; i <= question.max; i++) {
                        distribution[i] = 0;
                    }
                    
                    values.forEach(value => {
                        if (distribution[value] !== undefined) {
                            distribution[value]++;
                        }
                    });
                    
                    questionStats.distribution = distribution;
                } else {
                    questionStats.average = 0;
                    questionStats.min = 0;
                    questionStats.max = 0;
                    questionStats.totalResponses = 0;
                    questionStats.distribution = {};
                }
            }
            
            stats.questions.push(questionStats);
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка при расчете статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при расчете статистики'
        });
    }
};


const clearResults = (req, res) => {
    try {
        const count = surveyResults.length;
        surveyResults = [];
        nextId = 1;
        
        console.log(`Все результаты очищены. Удалено записей: ${count}`);
        
        res.json({
            success: true,
            message: `Все результаты успешно очищены`,
            deletedCount: count
        });
    } catch (error) {
        console.error('Ошибка при очистке результатов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при очистке результатов'
        });
    }
};


const getServerStatus = (req, res) => {
    try {
        res.json({
            success: true,
            status: 'running',
            timestamp: new Date().toISOString(),
            data: {
                totalResults: surveyResults.length,
                nextId: nextId,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            }
        });
    } catch (error) {
        console.error('Ошибка при получении статуса сервера:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при получении статуса'
        });
    }
};

module.exports = {
    getQuestions,
    saveResults,
    getAllResults,
    getResultById,
    deleteResult,
    getStatistics,
    clearResults,
    getServerStatus
};