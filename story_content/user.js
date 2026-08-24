window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script1 = function()
{
  // Stop recording & visualization, keep mic permission alive
window.isVisualizing = false;
if (window.animationFrameId) cancelAnimationFrame(window.animationFrameId);

if (window.customAudioRecorder && window.customAudioRecorder.state === "recording") {
  window.customAudioRecorder.stop();
}

if (window.activeAudioPlayer) {
  window.activeAudioPlayer.pause();
}

// Clear Canvas to static background
const canvas = document.getElementById('storylineWaveformCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
}

window.Script2 = function()
{
  if (!window.recordedAudioUrl) {
  alert("No recording found. Record something first!");
} else {
  // Reset previous playback
  if (window.activeAudioPlayer) window.activeAudioPlayer.pause();

  const canvas = document.getElementById('storylineWaveformCanvas');
  const canvasCtx = canvas.getContext('2d');

  const audio = new Audio(window.recordedAudioUrl);
  window.activeAudioPlayer = audio;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audio);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  window.isVisualizing = true;

  // Re-use wave renderer with Green wave for playback
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderPlaybackFrame() {
    if (!window.isVisualizing) return;
    window.animationFrameId = requestAnimationFrame(renderPlaybackFrame);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = '#f2f2f2';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = '#12c45b'; // Green wave for playback
    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

  renderPlaybackFrame();
  audio.play();

  // Reset visualizer when audio finishes
  audio.onended = () => {
    window.isVisualizing = false;
    canvasCtx.fillStyle = '#1e1e2f';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  };
}
}

window.Script3 = function()
{
  window.isVisualizing = false;
if (window.animationFrameId) {
  cancelAnimationFrame(window.animationFrameId);
}

if (window.customAudioRecorder && window.customAudioRecorder.state !== "inactive") {
  try { window.customAudioRecorder.stop(); } catch(e) {}
}

if (window.activeAudioPlayer) {
  window.activeAudioPlayer.pause();
  window.activeAudioPlayer = null;
}

// Clear old recording buffer
window.recordedAudioUrl = null;
window.audioChunks = [];

// 2. Target Canvas Overlay on WaveformBox shape
const storylineShape = document.querySelector('[data-acc-text="WaveformBox"]') || document.querySelector('.WaveformBox');
if (!storylineShape) {
  alert("Could not find the WaveformBox shape. Make sure your rectangle's Alt Text / Name is set to WaveformBox.");
  return;
}

let canvas = document.getElementById('storylineWaveformCanvas');
if (!canvas) {
  canvas = document.createElement('canvas');
  canvas.id = 'storylineWaveformCanvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.borderRadius = '8px';
  storylineShape.style.position = 'relative';
  storylineShape.appendChild(canvas);
}

const canvasCtx = canvas.getContext('2d');
canvas.width = storylineShape.clientWidth || 400;
canvas.height = storylineShape.clientHeight || 100;

// Helper function to render real-time microphone wave
function drawWaveform(analyser, strokeColor) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderFrame() {
    if (!window.isVisualizing) return;
    window.animationFrameId = requestAnimationFrame(renderFrame);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = '#1e1e2f'; // Background box color
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = strokeColor;
    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  renderFrame();
}

// 3. Start or reuse microphone recording
function startRecordingSession(stream) {
  window.customAudioRecorder = new MediaRecorder(stream);
  window.audioChunks = [];

  // Re-use or create AudioContext for visualizer
  if (!window.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioCtx();
  }
  
  if (window.audioContext.state === 'suspended') {
    window.audioContext.resume();
  }

  // Connect fresh stream source to analyser
  const source = window.audioContext.createMediaStreamSource(stream);
  const analyser = window.audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  window.isVisualizing = true;
  drawWaveform(analyser, '#ff4757'); // Red wave for recording

  window.customAudioRecorder.ondataavailable = e => {
    if (e.data.size > 0) window.audioChunks.push(e.data);
  };

  window.customAudioRecorder.onstop = () => {
    const audioBlob = new Blob(window.audioChunks, { type: 'audio/mp3' });
    window.recordedAudioUrl = URL.createObjectURL(audioBlob);
  };

  window.customAudioRecorder.start();
  console.log("Recording session active.");
}

// REUSE EXISTING STREAM (No pop-up) or request on FIRST click only
if (window.activeMicStream && window.activeMicStream.active) {
  startRecordingSession(window.activeMicStream);
} else {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      window.activeMicStream = stream; // Save stream globally
      startRecordingSession(stream);
    })
    .catch(err => {
      alert("Microphone access failed: " + err);
    });
}
}

};
