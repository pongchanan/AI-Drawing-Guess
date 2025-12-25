// Initialize variables
let classifier;
let canvas;
// Removing p5 elements variables since we'll use vanilla JS for updates
// let labelSpan;
// let confidenceSpan;
let clearButton;

// Preload the model
function preload() {
    // Using 'DoodleNet' which is trained on the Quick Draw dataset
    classifier = ml5.imageClassifier('DoodleNet', modelReady);
}

// Flag to prevent early classification
let isModelReady = false;
let inputImage; // Offscreen buffer

function modelReady() {
    console.log('Model Loaded!');
    isModelReady = true;
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

    // Get DOM elements with p5 (only for button or simple interactions)
    clearButton = select('#clearBtn');

    // Attach event listener to clear button
    clearButton.mousePressed(clearCanvas);

    // Initial label
    document.getElementById('label').innerText = 'Draw something...';
    document.getElementById('confidence').innerText = '0%';
}

function clearCanvas() {
    background(255);
    // Also clear buffer
    if (inputImage) {
        inputImage.background(255);
    }

    document.getElementById('label').innerText = 'Draw something...';
    document.getElementById('confidence').innerText = '0%';
    console.log('Canvas cleared');
}

function draw() {
    // Set stroke properties
    stroke(0);
    strokeWeight(16);

    // Draw if mouse is pressed
    if (mouseIsPressed) {
        line(pmouseX, pmouseY, mouseX, mouseY);

        // Also draw on the offscreen buffer to keep them in sync
        if (inputImage) {
            inputImage.stroke(0);
            inputImage.strokeWeight(16);
            inputImage.line(pmouseX, pmouseY, mouseX, mouseY);
        }
        // We classify every time we draw a line segment for "real-time" feel
        // However, to avoid spamming, we could throttle this or just use mouseReleased.
        // For smoother feel, let's classify on mouseReleased.
    }
}

// Classify when the user finishes a stroke
function mouseReleased() {
    classifyCanvas();
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
        console.warn('Model not ready yet.');
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
    let label = topResult.label.replace(/_/g, ' ');
    let confidence = topResult.confidence;

    let confidenceText = Math.floor(confidence * 100) + '%';
    // console.log('Top Guess:', label, confidenceText);

    // 1. Try DOM update
    try {
        let labelEl = document.getElementById('label');
        let confEl = document.getElementById('confidence');

        if (labelEl) {
            labelEl.innerText = label;
            labelEl.style.color = '#6c5ce7'; // Force color just in case
        } else {
            // console.error('CRITICAL: #label element not found!');
        }

        if (confEl) {
            confEl.innerText = confidenceText;
        } else {
            // console.error('CRITICAL: #confidence element not found!');
        }
    } catch (e) {
        console.error('Error updating DOM:', e);
    }

}
