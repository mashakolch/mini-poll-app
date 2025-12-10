
const API_BASE = '/api/survey';
let questions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    loadStatistics();
    
 
    initForm();
});

function initForm() {
    const form = document.getElementById('surveyForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await submitForm();
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    if (tabName === 'results') {
        loadResults();
    } else if (tabName === 'statistics') {
        loadStatistics();
    }
}

async function loadQuestions() {
    try {
        showMessage('Загрузка вопросов...', 'info');
        const response = await fetch(`${API_BASE}/questions`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        questions = data.questions;
        renderQuestions();
        showMessage('Вопросы загружены', 'success');
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        showMessage('Ошибка загрузки вопросов. Проверьте подключение к серверу.', 'error');
    }
}

function renderQuestions() {
    const container = document.querySelector('.questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionHTML = `
            <div class="question-card">
                <div class="question-number">Вопрос ${index + 1}: ${question.question}</div>
                <div class="options-container" id="question-${index}">
                    ${renderQuestionOptions(question, index)}
                </div>
            </div>
        `;
        container.innerHTML += questionHTML;
    });
    
    setupRangeHandlers();
}

function setupRangeHandlers() {
    questions.forEach((question, index) => {
        if (question.type === 'range') {
            const rangeInput = document.getElementById(`q${index}`);
            if (rangeInput) {
                rangeInput.addEventListener('input', function(e) {
                    const valueDisplay = document.getElementById(`range-value-${index}`);
                    if (valueDisplay) {
                        valueDisplay.textContent = e.target.value;
                    }
                });
            }
        }
    });
}

function renderQuestionOptions(question, questionIndex) {
    let html = '';
    
    if (question.type === 'radio') {
        question.options.forEach((option, optionIndex) => {
            html += `
                <div class="option">
                    <input type="radio" 
                           id="q${questionIndex}-opt${optionIndex}" 
                           name="answer${questionIndex}" 
                           value="${option}"
                           ${optionIndex === 0 ? 'checked' : ''}
                           required>
                    <label for="q${questionIndex}-opt${optionIndex}">${option}</label>
                </div>
            `;
        });
    } 
    else if (question.type === 'select') {
        html += `<select name="answer${questionIndex}" class="form-select" required>`;
        html += `<option value="" disabled selected>Выберите вариант</option>`;
        question.options.forEach(option => {
            html += `<option value="${option}">${option}</option>`;
        });
        html += '</select>';
    }
    else if (question.type === 'checkbox') {
        html += '<div class="checkbox-group">';
        question.options.forEach((option, optionIndex) => {
            html += `
                <div class="option">
                    <input type="checkbox" 
                           id="q${questionIndex}-opt${optionIndex}" 
                           name="answer${questionIndex}" 
                           value="${option}">
                    <label for="q${questionIndex}-opt${optionIndex}">${option}</label>
                </div>
            `;
        });
        html += '</div>';
    }
    else if (question.type === 'range') {
        const defaultValue = Math.floor((question.min + question.max) / 2);
        html += `
            <div class="range-container">
                <input type="range" 
                       id="q${questionIndex}" 
                       name="answer${questionIndex}"
                       min="${question.min}" 
                       max="${question.max}" 
                       value="${defaultValue}"
                       required>
                <div class="range-values">
                    <span>${question.min} (минимально)</span>
                    <span>${question.max} (максимально)</span>
                </div>
                <div style="text-align: center; margin-top: 5px;">
                    Текущее значение: <span id="range-value-${questionIndex}">${defaultValue}</span>
                </div>
            </div>
        `;
    }
    
    return html;
}

async function submitForm() {
    const nameInput = document.getElementById('name');
    const name = nameInput ? nameInput.value.trim() : '';
    
    if (!name || name.length < 2) {
        showMessage('Имя должно содержать минимум 2 символа', 'error');
        if (nameInput) nameInput.focus();
        return;
    }
    
    const answers = [];
    let hasErrors = false;
    
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        if (question.type === 'radio') {
            const selected = document.querySelector(`input[name="answer${i}"]:checked`);
            if (selected) {
                answers.push(selected.value);
            } else {
                showMessage(`Пожалуйста, ответьте на вопрос ${i + 1}`, 'error');
                hasErrors = true;
                break;
            }
        }
        else if (question.type === 'select') {
            const select = document.querySelector(`select[name="answer${i}"]`);
            if (select && select.value) {
                answers.push(select.value);
            } else {
                showMessage(`Пожалуйста, выберите вариант для вопроса ${i + 1}`, 'error');
                hasErrors = true;
                break;
            }
        }
        else if (question.type === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="answer${i}"]:checked`);
            const selectedValues = Array.from(checkboxes).map(cb => cb.value);
            if (selectedValues.length > 0) {
                answers.push(selectedValues);
            } else {
                showMessage(`Пожалуйста, выберите хотя бы один вариант для вопроса ${i + 1}`, 'error');
                hasErrors = true;
                break;
            }
        }
        else if (question.type === 'range') {
            const range = document.getElementById(`q${i}`);
            if (range && range.value) {
                answers.push(parseInt(range.value));
            } else {
                showMessage(`Пожалуйста, установите значение для вопроса ${i + 1}`, 'error');
                hasErrors = true;
                break;
            }
        }
    }
    
    if (hasErrors) {
        return;
    }
    
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name: name,
                answers: answers 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message || 'Результаты успешно сохранены!', 'success');
            resetForm();
            await loadStatistics();
            showTab('statistics');
        } else {
            showMessage(data.error || 'Ошибка сохранения данных', 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showMessage('Ошибка отправки данных. Проверьте подключение к серверу.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function resetForm() {
    const form = document.getElementById('surveyForm');
    if (form) {
        form.reset();
    }
    
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
    }
    
    questions.forEach((question, index) => {
        if (question.type === 'range') {
            const midValue = Math.floor((question.min + question.max) / 2);
            const rangeInput = document.getElementById(`q${index}`);
            const valueDisplay = document.getElementById(`range-value-${index}`);
            
            if (rangeInput) {
                rangeInput.value = midValue;
            }
            if (valueDisplay) {
                valueDisplay.textContent = midValue;
            }
        }
    });
}

async function loadResults() {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;
    
    resultsList.innerHTML = '<div class="loading">Загрузка результатов...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/results?limit=20&offset=0`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            resultsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Результатов пока нет. Будьте первым!</p>';
            return;
        }
        
        let html = '';
        data.results.forEach(result => {
            html += `
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-name">${result.name || 'Аноним'}</span>
                        <span class="result-date">${new Date(result.timestamp).toLocaleString('ru-RU')}</span>
                    </div>
                    <div class="result-answers">
                        ${renderResultAnswers(result.answers)}
                    </div>
                </div>
            `;
        });
        
        resultsList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        resultsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #cc0000;">Ошибка загрузки результатов</p>';
    }
}

function renderResultAnswers(answers) {
    if (!answers || !Array.isArray(answers)) {
        return '<p>Нет ответов</p>';
    }
    
    let html = '';
    answers.forEach((answer, index) => {
        const question = questions[index];
        let answerText = '';
        
        if (Array.isArray(answer)) {
            answerText = answer.join(', ') || 'Не выбрано';
        } else if (answer === null || answer === undefined || answer === '') {
            answerText = 'Нет ответа';
        } else {
            answerText = answer.toString();
        }
        
        html += `
            <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px dashed #eee;">
                <strong>${index + 1}.</strong> ${answerText}
            </div>
        `;
    });
    return html;
}

async function loadStatistics() {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка статистики...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/statistics`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        const totalCountElem = document.getElementById('totalCount');
        if (totalCountElem) {
            totalCountElem.textContent = data.totalParticipants || 0;
        }
        
        let html = '';
        
        if (!data.totalParticipants || data.totalParticipants === 0) {
            html = '<p style="text-align: center; padding: 20px; color: #666;">Еще нет данных для статистики</p>';
        } else {
            data.questions.forEach((questionStats, index) => {
                html += `
                    <div class="stat-item">
                        <div class="stat-question">${index + 1}. ${questionStats.question || 'Вопрос'}</div>
                `;
                
                if (questionStats.type === 'radio' || questionStats.type === 'select') {
                    if (questionStats.counts && typeof questionStats.counts === 'object') {
                        Object.entries(questionStats.counts).forEach(([option, count]) => {
                            const percentage = questionStats.percentages && questionStats.percentages[option] 
                                ? questionStats.percentages[option] 
                                : Math.round((count / data.totalParticipants) * 100);
                            
                            html += `
                                <div class="stat-bar-container">
                                    <div class="stat-bar" style="width: ${percentage}%"></div>
                                    <div class="stat-label">
                                        <span>${option}</span>
                                        <span>${count} (${percentage}%)</span>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        html += '<p>Нет данных</p>';
                    }
                }
                else if (questionStats.type === 'checkbox') {
                    if (questionStats.counts && typeof questionStats.counts === 'object') {
                        Object.entries(questionStats.counts).forEach(([option, count]) => {
                            const percentage = Math.round((count / data.totalParticipants) * 100);
                            html += `
                                <div class="stat-bar-container">
                                    <div class="stat-bar" style="width: ${percentage}%"></div>
                                    <div class="stat-label">
                                        <span>${option}</span>
                                        <span>${count} (${percentage}%)</span>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        html += '<p>Нет данных</p>';
                    }
                }
                else if (questionStats.type === 'range') {
                    if (questionStats.average) {
                        html += `
                            <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                                <strong>Среднее значение:</strong> ${questionStats.average}<br>
                                <strong>Минимум:</strong> ${questionStats.min || 'н/д'}<br>
                                <strong>Максимум:</strong> ${questionStats.max || 'н/д'}
                            </div>
                        `;
                    } else {
                        html += '<p>Нет данных</p>';
                    }
                }
                
                html += '</div>';
            });
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #cc0000;">Ошибка загрузки статистики</p>';
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}


const style = document.createElement('style');
style.textContent = `
    .message.info {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }
`;
document.head.appendChild(style);