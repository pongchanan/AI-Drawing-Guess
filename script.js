// Game Variables
let targetWord = '';
let score = 0;
let isGameActive = true;
let gameWords = [
    'cat', 'dog', 'tree', 'house', 'face', 'apple', 'book', 'bow', 'candle', 'car',
    'cloud', 'cup', 'door', 'envelope', 'fish', 'guitar', 'ice_cream', 'key', 'ladder',
    'light_bulb', 'moon', 'mountain', 'pants', 'pizza', 'star', 'sun', 'umbrella'
];

// Initialize variables
let classifier;
let canvas;
// Removing p5 elements variables since we'll use vanilla JS for updates
// let labelSpan;
// let confidenceSpan;
let clearButton;
let skipButton;

// Flag to prevent early classification
let isModelReady = false;
let inputImage; // Offscreen buffer

function preload() {
    // Using 'DoodleNet' which is trained on the Quick Draw dataset
    // Model loading moved to setup to avoid blocking
}

function modelReady() {
    console.log('Model Loaded!');
    isModelReady = true;
    nextRound(); // Start the first round when model is ready
}

function setup() {
    // Set pixel density to 1 to avoid tensor shape mismatch on high-DPI screens
    // The model expects 28x28 input; high density (e.g. retina) creates mismatching data
    pixelDensity(1);

    // Create canvas and attach to the wrapper
    let canvasDiv = document.getElementById('canvas-wrapper');
    // DoodleNet works best with 280x280 (10x the 28x28 training data)
    canvas = createCanvas(280, 280);
    canvas.parent('canvas-wrapper');

    // Create an offscreen buffer for the classifier
    // This ensures that even if the main canvas has display issues or scaling,
    // we have a clean, correct-dimension image to send to the AI.
    inputImage = createGraphics(280, 280);
    inputImage.pixelDensity(1);
    inputImage.background(255);

    // Set white background initially
    background(255);

    // Load the model asynchronously WITHOUT blocking the canvas
    console.log('Loading model...');
    classifier = ml5.imageClassifier('DoodleNet', modelReady);

    // Get DOM elements with p5 (only for button or simple interactions)
    clearButton = select('#clearBtn');
    skipButton = select('#skipBtn');

    // Attach event listener to clear button
    clearButton.mousePressed(clearCanvas);
    skipButton.mousePressed(nextRound);

    // Initial label
    document.getElementById('label').innerText = 'Draw...';
    document.getElementById('confidence').innerText = '0%';
    console.log('Canvas cleared');
}

function nextRound() {
    isGameActive = true;

    // Hide overlay
    let overlay = document.getElementById('game-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
    }

    // Pick random word
    targetWord = random(gameWords);

    let targetEl = document.getElementById('target-word');
    if (targetEl) {
        targetEl.innerText = targetWord.replace(/_/g, ' ');
    }

    // Clear canvas
    clearCanvas();
}

function handleWin() {
    if (!isGameActive) return;

    isGameActive = false;
    score++;

    let scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.innerText = score;

    // Show overlay
    let overlay = document.getElementById('game-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('visible');
    }

    // Wait and start next round
    setTimeout(nextRound, 2000);
}

function clearCanvas() {
    background(255);
    // Also clear buffer
    if (inputImage) {
        inputImage.background(255);
    }

    document.getElementById('label').innerText = 'Draw...';
    document.getElementById('confidence').innerText = '0%';
    console.log('Canvas cleared');
}

function draw() {
    // Set stroke properties
    stroke(0);
    strokeWeight(16);

    // Draw if mouse is pressed
    if (mouseIsPressed && isGameActive) {
        line(pmouseX, pmouseY, mouseX, mouseY);

        // Also draw on the offscreen buffer to keep them in sync
        if (inputImage) {
            inputImage.stroke(0);
            inputImage.strokeWeight(16);
            inputImage.line(pmouseX, pmouseY, mouseX, mouseY);
        }
    }
}

// Classify when the user finishes a stroke
function mouseReleased() {
    if (isGameActive) {
        classifyCanvas();
    }
}

function classifyCanvas() {
    if (classifier && isModelReady && inputImage) {
        // Pass the offscreen graphics buffer.
        // This is the cleanest input possible for the model.
        try {
            classifier.classify(inputImage, gotResult);
        } catch (e) {
            console.error('Classification error:', e);
        }
    } else {
        // console.warn('Model not ready yet.');
    }
}

function gotResult(error, results) {
    // Handle specific ml5.js signature issues where results come as the first argument
    if (Array.isArray(error)) {
        results = error;
        error = null;
    }

    if (error) {
        console.error(error);
        return;
    }

    // The results are in an array ordered by confidence.
    // The results are in an array ordered by confidence.
    // console.log('Results received:', results);

    // Update the UI
    let topResult = results[0];
    let label = topResult.label; // Raw label for logic
    let displayLabel = label.replace(/_/g, ' '); // Clean label for display
    let confidence = topResult.confidence;

    let confidenceText = Math.floor(confidence * 100) + '%';
    // console.log('Top Guess:', label, confidenceText);

    // 1. Try DOM update
    try {
        let labelEl = document.getElementById('label');
        let confEl = document.getElementById('confidence');

        if (labelEl) {
            labelEl.innerText = displayLabel;
            labelEl.style.color = '#6c5ce7'; // Force color just in case
        } else {
            // console.error('CRITICAL: #label element not found!');
        }

        if (confEl) {
            confEl.innerText = confidenceText;
        } else {
            // console.error('CRITICAL: #confidence element not found!');
        }

        // CHECK WIN CONDITION
        // Using a very low confidence threshold because simple drawings might score poorly but still be "top1"
        if (label === targetWord && confidence > 0.01) {
            handleWin();
        }

    } catch (e) {
        console.error('Error updating DOM:', e);
    }

}
