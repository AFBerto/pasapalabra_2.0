document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, scripts.js ejecutado');
    const roscoStartButton = document.getElementById('roscoStartButton');
    if (roscoStartButton) {
        roscoStartButton.addEventListener('click', startRoscoGame);
        console.log('Evento click registrado para roscoStartButton');
    } else {
        console.error('Elemento #roscoStartButton no encontrado');
    }

    const categoryButtons = document.querySelectorAll('.category-buttons img');
    if (categoryButtons.length === 0) {
        console.error('No se encontraron botones de categoría con la clase .category-buttons img');
    } else {
        categoryButtons.forEach(button => {
            console.log(`Botón de categoría ${button.alt} encontrado con onclick: ${button.onclick}`);
        });
    }

    const levelButtons = document.querySelectorAll('.level-buttons img');
    if (levelButtons.length === 0) {
        console.error('No se encontraron botones de nivel con la clase .level-buttons img');
    } else {
        levelButtons.forEach(button => {
            console.log(`Botón de nivel ${button.alt} encontrado con onclick: ${button.onclick}`);
        });
    }

    // Asegurarse de que el evento click de backButton se añada solo una vez
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', returnToLevelSelection);
        console.log('Evento click registrado para backButton');
    }

    // Asegurarse de que el evento click de backToCategoryButton se añada solo una vez
    const backToCategoryButton = document.getElementById('backToCategoryButton');
    if (backToCategoryButton) {
        backToCategoryButton.addEventListener('click', returnToCategorySelection);
        console.log('Evento click registrado para backToCategoryButton');
    }

    // Inicializar Firebase
    const firebaseConfig = {
        apiKey: "TU_API_KEY",
        authDomain: "TU_AUTH_DOMAIN",
        projectId: "TU_PROJECT_ID",
        storageBucket: "TU_STORAGE_BUCKET",
        messagingSenderId: "TU_MESSAGING_SENDER_ID",
        appId: "TU_APP_ID"
    };
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado');
});

// Estructura de roscos por categoría y nivel
const availableRoscos = {
    fisica: {
        eso2: [
            { id: 'fisica-eso2-1', name: 'Rosco de ESO 2', level: 'ESO 2', number: 1 }
        ],
        eso3: [
            { id: 'fisica-eso3-1', name: 'Rosco de ESO 3', level: 'ESO 3', number: 1 }
        ],
        eso4: [
            { id: 'fisica-eso4-1', name: 'Rosco de ESO 4', level: 'ESO 4', number: 1 }
        ],
        bach1: [
            { id: 'fisica-bach1-1', name: 'Rosco de Bachillerato 1', level: 'Bachillerato 1', number: 1 }
        ],
        bach2: [
            { id: 'fisica-bach2-1', name: 'Rosco de Bachillerato 2', level: '2º de Bachillerato', number: 1 }
        ]
    },
    quimica: {
        eso2: [
            { id: 'quimica-eso2-1', name: 'Rosco de ESO 2', level: 'ESO 2', number: 1 }
        ],
        eso3: [
            { id: 'quimica-eso3-1', name: 'Rosco de ESO 3', level: 'ESO 3', number: 1 }
        ],
        eso4: [
            { id: 'quimica-eso4-1', name: 'Rosco de ESO 4', level: 'ESO 4', number: 1 }
        ],
        bach1: [
            { id: 'quimica-bach1-1', name: 'Rosco de Bachillerato 1', level: 'Bachillerato 1', number: 1 }
        ],
        bach2: [
            { id: 'quimica-bach2-1', name: 'Rosco de Bachillerato 2', level: '2º de Bachillerato', number: 1 }
        ]
    }
};

// Variable global para almacenar las preguntas del nivel seleccionado
let currentWords = [];
let currentIndex = 0;
let passedWords = [];
let timer;
let timeLeft = 300; // 5 minutos
let gameStarted = false;
let currentRoscoId = 'fisica-eso2-1'; // Rosco inicial (Física, ESO 2)
let currentRoscoLevel = 'eso2'; // Nivel inicial (ESO 2)
let currentCategory = 'fisica'; // Categoría inicial (Física)
let correctCount = 0; // Contador de palabras acertadas
let errorCount = 0; // Contador de errores
let remainingCount = 25; // Contador de palabras restantes (inicialmente 25 letras)

// Inicializar Firestore
const db = firebase.firestore();

// Función para obtener preguntas desde Firestore
async function fetchQuestions(roscoId) {
    console.log(`Obteniendo preguntas para rosco ${roscoId} desde Firestore`);
    try {
        const docRef = db.collection('roscoQuestions').doc(roscoId);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            return data.questions || [];
        } else {
            console.error(`No se encontró el documento para rosco ${roscoId}`);
            return [];
        }
    } catch (error) {
        console.error('Error al obtener las preguntas desde Firestore:', error);
        return [];
    }
}

// Función para simular la verificación de una respuesta en el servidor
async function checkAnswerServer(roscoId, letterIndex, userAnswer) {
    console.log(`Verificando respuesta para rosco ${roscoId}, letra ${letterIndex}`);
    try {
        const docRef = db.collection('roscoQuestions').doc(roscoId);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            const question = data.questions[letterIndex];
            if (!question) {
                return { isCorrect: false, correctAnswer: null };
            }
            const isCorrect = userAnswer.trim().toLowerCase() === question.answer.toLowerCase();
            return { isCorrect, correctAnswer: question.answer };
        } else {
            console.error(`No se encontró el documento para rosco ${roscoId}`);
            return { isCorrect: false, correctAnswer: null };
        }
    } catch (error) {
        console.error('Error al verificar la respuesta desde Firestore:', error);
        return { isCorrect: false, correctAnswer: null };
    }
}

// Nueva función para seleccionar categoría (Física o Química)
function selectCategory(category) {
    console.log('selectCategory ejecutado con categoría:', category);

    // Validar categoría
    if (category !== 'fisica' && category !== 'quimica') {
        console.error('Categoría no reconocida:', category);
        return;
    }

    // Guardar la categoría seleccionada
    currentCategory = category;
    console.log('Categoría seleccionada:', currentCategory);

    // Ocultar la pantalla de selección de categoría
    const categorySelection = document.getElementById('categorySelection');
    if (categorySelection) {
        categorySelection.style.display = 'none';
        console.log('#categorySelection ocultado');
    } else {
        console.error('Elemento #categorySelection no encontrado');
    }

    // Mostrar la pantalla de selección de nivel
    const levelSelection = document.getElementById('levelSelection');
    if (levelSelection) {
        levelSelection.style.display = 'block';
        console.log('#levelSelection mostrado');
    } else {
        console.error('Elemento #levelSelection no encontrado');
    }
}

function selectLevel(level) {
    console.log('selectLevel ejecutado con nivel:', level);

    // Validar que haya una categoría seleccionada
    if (!currentCategory) {
        console.error('No se ha seleccionado una categoría antes de elegir el nivel');
        return;
    }

    // Verificar si el nivel existe dentro de la categoría seleccionada
    if (!availableRoscos[currentCategory] || !availableRoscos[currentCategory][level]) {
        console.error(`Nivel ${level} no reconocido para la categoría ${currentCategory}`);
        return;
    }

    const rosco = availableRoscos[currentCategory][level][0];
    if (!rosco) {
        console.error(`No se encontraron roscos para el nivel ${level} en la categoría ${currentCategory}`);
        return;
    }

    console.log('Rosco seleccionado:', rosco);

    currentRoscoId = rosco.id;
    currentRoscoLevel = level;

    fetchQuestions(currentRoscoId).then(words => {
        console.log('Preguntas cargadas:', words);
        currentWords = words;

        correctCount = 0;
        errorCount = 0;
        remainingCount = currentWords.length; // Inicializamos con el número de letras
        updateCounters();

        console.log('currentWords asignado, longitud:', currentWords.length, 'roscoId:', currentRoscoId, 'level:', currentRoscoLevel);

        const levelSelection = document.getElementById('levelSelection');
        if (levelSelection) {
            levelSelection.style.display = 'none';
            console.log('#levelSelection ocultado');
        } else {
            console.error('Elemento #levelSelection no encontrado');
        }

        const gameContent = document.getElementById('gameContent');
        if (gameContent) {
            gameContent.style.display = 'block';
            console.log('#gameContent mostrado');
        } else {
            console.error('Elemento #gameContent no encontrado');
        }

        const roscoCenter = document.getElementById('roscoCenter');
        const rotatingImage = document.getElementById('rotatingImage');
        const backButton = document.getElementById('backButton');
        if (roscoCenter) {
            roscoCenter.style.display = 'flex';
            roscoCenter.style.animation = 'none'; // Restablecer animación
            roscoCenter.style.opacity = '1'; // Restablecer opacidad
            console.log('#roscoCenter mostrado');
        } else {
            console.error('Elemento #roscoCenter no encontrado');
        }
        if (rotatingImage) {
            rotatingImage.style.display = 'block';
            rotatingImage.style.animation = 'rotate 50s linear infinite'; // Restaurar animación de rotación
            rotatingImage.style.opacity = '1'; // Restablecer opacidad
            console.log('#rotatingImage mostrado');
        } else {
            console.error('Elemento #rotatingImage no encontrado');
        }
        if (backButton) {
            backButton.style.display = 'block';
            console.log('#backButton mostrado');
        } else {
            console.error('Elemento #backButton no encontrado');
        }

        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.style.display = 'none';
            console.log('#startButton ocultado');
        } else {
            console.error('Elemento #startButton no encontrado');
        }

        const roscoTitle = document.querySelector('.rosco-title');
        if (roscoTitle) {
            // Ajustar el título según la categoría y nivel seleccionados, en tres líneas
            const categoryText = currentCategory === 'fisica' ? 'Física' : 'Química';
            roscoTitle.innerHTML = `
                <span class="rosco-line1">Vas a jugar al</span>
                <span class="rosco-line2">Rosco de ${categoryText}</span>
                <span class="rosco-level">Nivel: ${rosco.level}</span>
            `;
            console.log('Título del rosco actualizado');
        } else {
            console.error('Elemento .rosco-title no encontrado');
        }

        gameStarted = false;
        currentIndex = 0;
        passedWords = [];
        timeLeft = 300;
        if (timer) {
            clearInterval(timer);
            timer = null;
            console.log('Temporizador reiniciado');
        }

        initializeRosco();
    }).catch(error => {
        console.error('Error al cargar las preguntas:', error);
    });
}

function initializeRosco() {
    console.log('initializeRosco ejecutado');
    const rosco = document.getElementById('rosco');
    if (!rosco) {
        console.error('Elemento #rosco no encontrado');
        return;
    }

    const radius = 260;
    const centerX = 300;
    const centerY = 240;

    // Limpiar el contenido previo de #rosco, pero conservar los elementos fijos
    const rotatingImage = document.getElementById('rotatingImage');
    const roscoCenter = document.getElementById('roscoCenter');
    const timerDisplay = document.getElementById('timerDisplay');
    const correctCountDisplay = document.getElementById('correctCountDisplay');
    const errorCountDisplay = document.getElementById('errorCountDisplay');
    const remainingCountDisplay = document.getElementById('remainingCountDisplay');
    const backButton = document.getElementById('backButton');

    // Limpiar solo los elementos que no queremos conservar (como letras y contenedores de preguntas)
    rosco.querySelectorAll('.letter, #questionContainer, #errorContainer').forEach(element => element.remove());

    // Restablecer las propiedades de #rotatingImage y #roscoCenter
    if (rotatingImage) {
        rotatingImage.style.display = 'block';
        rotatingImage.style.animation = 'rotate 50s linear infinite'; // Restaurar animación de rotación
        rotatingImage.style.opacity = '1'; // Restablecer opacidad
        rotatingImage.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
        rosco.appendChild(rotatingImage);
        console.log('Elemento #rotatingImage añadido al rosco');
    }
    if (roscoCenter) {
        roscoCenter.style.display = 'flex';
        roscoCenter.style.animation = 'none'; // Restablecer animación
        roscoCenter.style.opacity = '1'; // Restablecer opacidad
        roscoCenter.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
        rosco.appendChild(roscoCenter);
        console.log('Elemento #roscoCenter añadido al rosco');
    }
    if (timerDisplay) {
        rosco.appendChild(timerDisplay);
        console.log('Elemento #timerDisplay añadido al rosco');
    }
    if (correctCountDisplay) {
        rosco.appendChild(correctCountDisplay);
    }
    if (errorCountDisplay) {
        rosco.appendChild(errorCountDisplay);
    }
    if (remainingCountDisplay) {
        rosco.appendChild(remainingCountDisplay);
    }
    if (backButton) {
        rosco.appendChild(backButton);
        console.log('Elemento #backButton añadido al rosco');
    }

    if (!currentWords || currentWords.length === 0) {
        console.error('currentWords está vacío o no definido');
        return;
    }

    console.log('Generando', currentWords.length, 'letras para el rosco');

    currentWords.forEach((word, index) => {
        console.log(`Procesando letra ${word.letter} (índice ${index})`);
        const letterImg = document.createElement('img');
        letterImg.className = 'letter';
        letterImg.id = `letter-${index}`;
        letterImg.src = `images/${word.letter.toLowerCase()}.png`;
        console.log(`Asignando src: ${letterImg.src}`);

        letterImg.onerror = () => {
            console.error(`Error al cargar la imagen: images/${word.letter.toLowerCase()}.png`);
        };
        letterImg.onload = () => {
            console.log(`Imagen cargada correctamente: images/${word.letter.toLowerCase()}.png`);
        };

        const angle = (index / currentWords.length) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        letterImg.style.left = `calc(${x}px - 25px)`;
        letterImg.style.top = `calc(${y}px - 25px)`;

        rosco.appendChild(letterImg);
        console.log(`Letra ${word.letter} añadida al DOM`);
    });
    console.log('Rosco inicializado con', currentWords.length, 'letras');
}

function startRoscoGame() {
    console.log('startRoscoGame ejecutado');

    const rotatingImage = document.getElementById('rotatingImage');
    const roscoCenter = document.getElementById('roscoCenter');

    if (rotatingImage && roscoCenter) {
        // Detener la animación de rotación de rotatingImage
        rotatingImage.style.animation = 'none';

        // Aplicar la animación growAndShrinkFade a ambos elementos simultáneamente
        rotatingImage.style.animation = 'growAndShrinkFade 1s ease-in-out forwards';
        roscoCenter.style.animation = 'growAndShrinkFade 1s ease-in-out forwards';

        // Asegurarse de que ambos elementos se oculten después de la animación
        setTimeout(() => {
            rotatingImage.style.display = 'none';
            roscoCenter.style.display = 'none';
        }, 1000); // 1000ms para que coincida con la duración de growAndShrinkFade

        // Después de que la animación termine, mostrar la letra A y el contenedor de preguntas
        setTimeout(() => {
            const letterA = document.getElementById('letter-0');
            if (letterA) {
                letterA.classList.add('blinking');
            } else {
                console.error('Elemento letter-0 no encontrado');
            }

            const rosco = document.getElementById('rosco');
            // Asegurarse de que no haya un #questionContainer existente
            const existingQuestionContainer = document.getElementById('questionContainer');
            if (existingQuestionContainer) {
                existingQuestionContainer.remove();
            }

            const questionContainer = document.createElement('div');
            questionContainer.id = 'questionContainer';
            questionContainer.innerHTML = `
                <div class="question-box">
                    <p class="question-text">EMPIEZA POR A</p>
                </div>
                <p id="definition"></p>
                <input type="text" id="answerInput" class="answer-input" placeholder="ESCRIBE AQUÍ TU RESPUESTA">
                <p id="feedback"></p>
                <button id="okButton" class="action-button" tabindex="-1">
                    <img src="images/respuesta.png" alt="Responder" class="action-img" data-original="images/respuesta.png" data-hover="images/respuestaw.png">
                </button>
                <button id="passButton" class="action-button">
                    <img src="images/pasapalabra.png" alt="Pasapalabra" class="action-img" data-original="images/pasapalabra.png" data-hover="images/pasapalabraw.png">
                </button>
            `;
            rosco.appendChild(questionContainer);

            const okButton = document.getElementById('okButton');
            const passButton = document.getElementById('passButton');

            okButton.addEventListener('click', checkAnswer);
            passButton.addEventListener('click', passWord);

            document.querySelectorAll('.action-button').forEach(button => {
                const img = button.querySelector('.action-img');
                const originalSrc = img.getAttribute('data-original');
                const hoverSrc = img.getAttribute('data-hover');
                button.addEventListener('mouseover', () => {
                    img.src = hoverSrc;
                });
                button.addEventListener('mouseout', () => {
                    img.src = originalSrc;
                });
            });

            startGame();
        }, 1000); // 1000ms para que coincida con la duración de growAndShrinkFade
    } else {
        console.error('Elemento #rotatingImage o #roscoCenter no encontrado');
    }
}

function startGame() {
    console.log('startGame ejecutado');
    if (!gameStarted) {
        gameStarted = true;
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.style.display = 'none';
            console.log('#startButton ocultado');
        }
        loadQuestion(0);
        console.log('Juego iniciado');
    }
}

function updateCounters() {
    const correctCountElement = document.getElementById('correctCount');
    const errorCountElement = document.getElementById('errorCount');
    const remainingCountElement = document.getElementById('remainingCount');
    if (correctCountElement) {
        correctCountElement.textContent = correctCount;
    } else {
        console.error('Elemento #correctCount no encontrado');
    }
    if (errorCountElement) {
        errorCountElement.textContent = errorCount;
    } else {
        console.error('Elemento #errorCount no encontrado');
    }
    if (remainingCountElement) {
        remainingCountElement.textContent = remainingCount;
    } else {
        console.error('Elemento #remainingCount no encontrado');
    }
}

function adjustDefinitionFontSize(definitionElement, text) {
    if (!definitionElement || !text) return;

    const maxFontSize = 24; // Tamaño máximo de la fuente
    const minFontSize = 16; // Tamaño mínimo de la fuente
    let fontSize = maxFontSize;
    definitionElement.style.fontSize = `${fontSize}px`;

    // Crear un elemento temporal para medir la altura del texto
    const tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.whiteSpace = 'normal';
    tempElement.style.overflowWrap = 'break-word';
    tempElement.style.lineHeight = '1.2';
    tempElement.style.width = definitionElement.style.maxWidth;
    tempElement.style.fontFamily = "'Nunito', sans-serif";
    tempElement.style.fontWeight = '700';
    tempElement.textContent = text;
    document.body.appendChild(tempElement);

    // Reducir el tamaño de la fuente hasta que el texto quepa en 3 líneas
    while (fontSize >= minFontSize) {
        tempElement.style.fontSize = `${fontSize}px`;
        const computedHeight = tempElement.offsetHeight;
        const lineHeight = parseFloat(getComputedStyle(tempElement).lineHeight);
        const maxHeight = lineHeight * 3; // Altura máxima para 3 líneas

        if (computedHeight <= maxHeight) {
            break; // El texto cabe en 3 líneas, salir del bucle
        }
        fontSize -= 1; // Reducir el tamaño de la fuente
    }

    // Aplicar el tamaño calculado al elemento real
    definitionElement.style.fontSize = `${fontSize}px`;
    document.body.removeChild(tempElement);
}

function loadQuestion(index) {
    console.log('loadQuestion ejecutado con index:', index);
    currentIndex = index;
    const word = currentWords[index];
    const currentLetterElement = document.querySelector('.question-text');
    const definitionElement = document.getElementById('definition');
    const feedbackElement = document.getElementById('feedback');

    if (currentLetterElement && definitionElement && feedbackElement) {
        // Determinar si es "EMPIEZA POR" o "CONTIENE LA"
        let prefix = 'EMPIEZA POR';
        if (word.definition && word.definition.startsWith('Contiene la')) {
            prefix = 'CONTIENE LA';
        }
        currentLetterElement.innerHTML = `${prefix} ${word.letter}`;

        // Eliminar "Con la [letra]:" o "Contiene la [letra]:" del texto de la definición
        let cleanDefinition = word.definition || 'Definición no proporcionada';
        if (cleanDefinition.startsWith('Con la')) {
            cleanDefinition = cleanDefinition.replace(/^Con la [A-ZÑ]:\s*/, '').trim();
        } else if (cleanDefinition.startsWith('Contiene la')) {
            cleanDefinition = cleanDefinition.replace(/^Contiene la [A-ZÑ]:\s*/, '').trim();
        }
        definitionElement.innerHTML = cleanDefinition;
        feedbackElement.innerHTML = '';

        // Ajustar dinámicamente el tamaño de la fuente
        adjustDefinitionFontSize(definitionElement, cleanDefinition);
    } else {
        console.error('Elementos del juego no encontrados:', {
            currentLetterElement,
            definitionElement,
            feedbackElement
        });
    }

    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.value = '';
    } else {
        console.error('Elemento #answerInput no encontrado');
    }

    document.querySelectorAll('.letter').forEach(letter => letter.classList.remove('active', 'blinking'));
    const currentLetter = document.getElementById(`letter-${index}`);
    if (currentLetter) {
        currentLetter.classList.add('active', 'blinking');
        currentLetter.src = `images/${word.letter.toLowerCase()}.png`;
    } else {
        console.error(`Elemento letter-${index} no encontrado`);
    }

    if (!timer && timeLeft > 0) {
        timer = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timerText = document.getElementById('timerText');
            if (timerText) {
                timerText.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                endGame("timeUp");
            }
        }, 1000);
        console.log('Temporizador iniciado');
    }
}

// Verificar si todas las letras están contestadas y si todas son correctas
function checkGameEnd() {
    const letters = document.querySelectorAll('.letter');
    let allAnswered = true;
    let allCorrect = true;

    letters.forEach(letter => {
        if (!letter.classList.contains('correct') && !letter.classList.contains('incorrect')) {
            allAnswered = false; // Hay al menos una letra no contestada
        }
        if (letter.classList.contains('incorrect')) {
            allCorrect = false; // Hay al menos una letra incorrecta
        }
    });

    if (allAnswered) {
        if (allCorrect) {
            endGame("completed"); // Todas las letras son correctas
        } else {
            endGame("allAnsweredWithIncorrect"); // Todas están contestadas, pero hay al menos una incorrecta
        }
        return true;
    }
    return false;
}

function showIncorrectMessage(letter, correctAnswer) {
    console.log('showIncorrectMessage ejecutado para letra:', letter, 'respuesta correcta:', correctAnswer);
    const rosco = document.getElementById('rosco');
    const questionContainer = document.getElementById('questionContainer');
    const backButton = document.getElementById('backButton');

    // Ocultar el botón de "atrás" mientras se muestra la pantalla de error
    if (backButton) {
        backButton.style.display = 'none';
        console.log('#backButton ocultado durante pantalla de error');
    } else {
        console.error('Elemento #backButton no encontrado');
    }

    // Ocultar el contenedor de preguntas
    if (questionContainer) {
        questionContainer.style.display = 'none';
    } else {
        console.error('Elemento #questionContainer no encontrado');
    }

    // Crear un overlay para el fondo rojo
    const errorOverlay = document.createElement('div');
    errorOverlay.id = 'errorOverlay';
    errorOverlay.className = 'error-overlay';
    document.body.appendChild(errorOverlay);

    // Crear un nuevo contenedor para el mensaje de error
    const errorContainer = document.createElement('div');
    errorContainer.id = 'errorContainer';
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
        <p class="error-no animate-no">NO</p>
    `;
    rosco.appendChild(errorContainer);

    // Después de 0.8 segundos, mostrar el fondo rojo y el resto del mensaje
    setTimeout(() => {
        errorOverlay.classList.add('error-overlay-visible');
        errorContainer.innerHTML = `
            <div class="error-background">
                <div class="error-letter-container">
                    <div class="error-circle"></div>
                    <img src="images/${letter.toLowerCase()}r.png" class="error-letter">
                </div>
                <p class="error-message">La respuesta correcta era:</p>
                <p class="correct-answer">${correctAnswer}</p>
                <p class="error-prompt">
                    <span class="prompt-line1">Aunque ya no podrías optar al bote, puedes</span><br>
                    <span class="prompt-line2">seguir completando el rosco. ¿Preparado?</span>
                </p>
                <button id="continueButton" class="error-continue-button">
                    <img src="images/continue.png" alt="Continuar">
                </button>
            </div>
        `;

        // Añadir el evento al botón "CONTINUAR"
        const continueButton = document.getElementById('continueButton');
        continueButton.addEventListener('click', () => {
            // Eliminar el overlay y el contenedor de error
            errorOverlay.remove();
            errorContainer.remove();
            // Mostrar nuevamente el contenedor de preguntas
            if (questionContainer) {
                questionContainer.style.display = 'flex';
            }
            // Volver a mostrar el botón de "atrás" después de cerrar la pantalla de error
            if (backButton) {
                backButton.style.display = 'block';
                console.log('#backButton mostrado después de cerrar pantalla de error');
            }
            // Pasar a la siguiente pregunta
            moveToNextQuestion();
        });
    }, 800);
}

function checkAnswer() {
    console.log('checkAnswer ejecutado');
    const userAnswer = document.getElementById('answerInput').value;
    const feedbackElement = document.getElementById('feedback');
    const letterImg = document.getElementById(`letter-${currentIndex}`);

    checkAnswerServer(currentRoscoId, currentIndex, userAnswer).then(result => {
        if (result.isCorrect === false && !result.correctAnswer) {
            feedbackElement.innerHTML = 'No se ha definido una respuesta para esta letra.';
            feedbackElement.style.color = 'red';
            return;
        }

        if (result.isCorrect) {
            feedbackElement.innerHTML = '¡Correcto!';
            feedbackElement.style.color = 'green';
            letterImg.classList.add('correct');
            letterImg.classList.remove('blinking');
            letterImg.src = `images/${currentWords[currentIndex].letter.toLowerCase()}v.png`;
            correctCount++;
            remainingCount--;
            moveToNextQuestion();
        } else {
            letterImg.classList.add('incorrect');
            letterImg.classList.remove('blinking');
            letterImg.src = `images/${currentWords[currentIndex].letter.toLowerCase()}r.png`;
            errorCount++;
            remainingCount--;
            // Mostrar el mensaje de error con la letra fallada
            showIncorrectMessage(currentWords[currentIndex].letter, result.correctAnswer);
        }
        updateCounters();
    }).catch(error => {
        console.error('Error al verificar la respuesta:', error);
        feedbackElement.innerHTML = 'Error al verificar la respuesta.';
        feedbackElement.style.color = 'red';
    });
}

function passWord() {
    console.log('passWord ejecutado');
    if (!passedWords.includes(currentIndex)) {
        passedWords.push(currentIndex);
    }
    moveToNextQuestion();
}

function moveToNextQuestion() {
    console.log('moveToNextQuestion ejecutado');

    // Verificar si todas las letras están contestadas
    if (checkGameEnd()) {
        return; // El juego ya terminó, no continuar
    }

    // Buscar la siguiente letra no contestada
    let nextIndex = (currentIndex + 1) % currentWords.length;
    let found = false;

    // Buscar la siguiente letra no contestada hacia adelante
    for (let i = 0; i < currentWords.length; i++) {
        if (!document.getElementById(`letter-${nextIndex}`).classList.contains('correct') &&
            !document.getElementById(`letter-${nextIndex}`).classList.contains('incorrect')) {
            loadQuestion(nextIndex);
            return;
        }
        nextIndex = (nextIndex + 1) % currentWords.length;
    }

    // Si no se encontró ninguna letra no contestada hacia adelante, buscar en passedWords
    if (passedWords.length > 0) {
        // Buscar la primera letra no contestada en passedWords
        let passedIndex = passedWords.find(index => {
            const letter = document.getElementById(`letter-${index}`);
            return !letter.classList.contains('correct') && !letter.classList.contains('incorrect');
        });

        if (passedIndex !== undefined) {
            passedWords = passedWords.filter(index => index !== passedIndex); // Remover de passedWords
            loadQuestion(passedIndex);
            return;
        }
    }

    // Si llegamos aquí y no se encontró ninguna letra no contestada, el juego debería haber terminado
    // Esto no debería ocurrir debido a la verificación inicial con checkGameEnd()
    console.error('No se encontraron letras no contestadas, pero el juego no ha terminado');
}

function endGame(reason) {
    console.log('endGame ejecutado con razón:', reason);
    clearInterval(timer);
    const questionContainer = document.getElementById('questionContainer');
    const restartButton = document.getElementById('restartButton');
    const backButton = document.getElementById('backButton');

    // Ocultar el botón de volver al finalizar el juego
    if (backButton) {
        backButton.style.display = 'none';
    }

    let message = '';
    if (reason === "completed") {
        message = '¡Felicidades! Has completado el rosco. ¡Gran trabajo!';
    } else if (reason === "timeUp") {
        message = '¡Bien jugado! Esta vez se acabó el tiempo, pero el próximo rosco te espera.';
    } else if (reason === "allAnsweredWithIncorrect") {
        message = '¡Bien jugado! Esta vez no lo has conseguido, pero el próximo rosco te espera.';
    }

    if (questionContainer && restartButton) {
        questionContainer.innerHTML = `<p class="end-game-message">${message}</p>`;
        restartButton.style.display = 'block';
    } else {
        console.error('Elementos para finalizar el juego no encontrados');
    }
}

function returnToLevelSelection() {
    console.log('returnToLevelSelection ejecutado');

    // Detener el temporizador
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('Temporizador detenido');
    }

    // Reiniciar el estado del juego
    currentWords = [];
    currentIndex = 0;
    passedWords = [];
    timeLeft = 300;
    gameStarted = false;
    correctCount = 0;
    errorCount = 0;
    remainingCount = 25;

    const timerText = document.getElementById('timerText');
    const restartButton = document.getElementById('restartButton');
    const gameContent = document.getElementById('gameContent');
    const levelSelection = document.getElementById('levelSelection');
    const backButton = document.getElementById('backButton');
    const rotatingImage = document.getElementById('rotatingImage');
    const roscoCenter = document.getElementById('roscoCenter');

    if (timerText) timerText.textContent = '5:00';
    if (restartButton) restartButton.style.display = 'none';
    if (backButton) backButton.style.display = 'none';

    // Restablecer las propiedades de #rotatingImage y #roscoCenter
    if (rotatingImage) {
        rotatingImage.style.display = 'block';
        rotatingImage.style.animation = 'rotate 50s linear infinite'; // Restaurar animación de rotación
        rotatingImage.style.opacity = '1'; // Restablecer opacidad
        rotatingImage.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
    }
    if (roscoCenter) {
        roscoCenter.style.display = 'flex';
        roscoCenter.style.animation = 'none'; // Restablecer animación
        roscoCenter.style.opacity = '1'; // Restablecer opacidad
        roscoCenter.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
    }

    // Mostrar la pantalla de selección de nivel y ocultar el juego
    if (gameContent && levelSelection) {
        gameContent.style.display = 'none';
        levelSelection.style.display = 'block';
        console.log('Volviendo a la selección de nivel');
    } else {
        console.error('Elementos para volver a la selección de nivel no encontrados');
    }
}

// Nueva función para volver a la selección de categoría desde la selección de nivel
function returnToCategorySelection() {
    console.log('returnToCategorySelection ejecutado');

    // Ocultar la pantalla de selección de nivel
    const levelSelection = document.getElementById('levelSelection');
    if (levelSelection) {
        levelSelection.style.display = 'none';
        console.log('#levelSelection ocultado');
    } else {
        console.error('Elemento #levelSelection no encontrado');
    }

    // Mostrar la pantalla de selección de categoría
    const categorySelection = document.getElementById('categorySelection');
    if (categorySelection) {
        categorySelection.style.display = 'block';
        console.log('#categorySelection mostrado');
    } else {
        console.error('Elemento #categorySelection no encontrado');
    }
}

function restartGame() {
    console.log('restartGame ejecutado');
    currentIndex = 0;
    passedWords = [];
    timeLeft = 300;
    gameStarted = false;
    correctCount = 0;
    errorCount = 0;
    remainingCount = currentWords.length;

    const timerText = document.getElementById('timerText');
    const restartButton = document.getElementById('restartButton');
    const startButton = document.getElementById('startButton');
    const rotatingImage = document.getElementById('rotatingImage');
    const roscoCenter = document.getElementById('roscoCenter');
    const backButton = document.getElementById('backButton');

    if (timerText) timerText.textContent = '5:00';
    if (restartButton) restartButton.style.display = 'none';
    if (startButton) startButton.style.display = 'none';
    if (rotatingImage) {
        rotatingImage.style.display = 'block';
        rotatingImage.style.animation = 'rotate 50s linear infinite'; // Restaurar la animación de rotación
        rotatingImage.style.opacity = '1'; // Restablecer opacidad
        rotatingImage.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
    }
    if (roscoCenter) {
        roscoCenter.style.display = 'flex';
        roscoCenter.style.animation = 'none'; // Restablecer animación
        roscoCenter.style.opacity = '1'; // Restablecer opacidad
        roscoCenter.style.transform = 'translate(-50%, -50%) scale(1)'; // Restablecer escala
    }
    if (backButton) backButton.style.display = 'block'; // Volver a mostrar el botón de volver

    document.querySelectorAll('.letter').forEach(letter => {
        letter.classList.remove('correct', 'incorrect', 'active', 'blinking');
        letter.src = `images/${letter.id.replace('letter-', '').toLowerCase()}.png`;
    });
    updateCounters();
    initializeRosco();
}
