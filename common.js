/* 音效合成 (Web Audio API) */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playChime(success = true) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  if (success) {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.18, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.5);
    });
  } else {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(261, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

function playFanfare() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [
    { f: 392.00, t: 0.0, d: 0.18 },
    { f: 523.25, t: 0.18, d: 0.18 },
    { f: 659.25, t: 0.36, d: 0.18 },
    { f: 783.99, t: 0.54, d: 0.35 },
    { f: 1046.50, t: 0.90, d: 0.70 }
  ];
  notes.forEach(n => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, now + n.t);
    gain.gain.setValueAtTime(0.25, now + n.t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d);
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));
  if (tab === 'idiom') {
    document.querySelectorAll('.tab-btn')[0]?.classList.add('active');
    document.getElementById('idiom-game')?.classList.add('active');
  } else if (tab === 'idiom-adv') {
    document.querySelectorAll('.tab-btn')[1]?.classList.add('active');
    document.getElementById('idiom-adv-game')?.classList.add('active');
  } else if (tab === 'sudoku') {
    document.querySelectorAll('.tab-btn')[2]?.classList.add('active');
    document.getElementById('sudoku-game')?.classList.add('active');
  }
}

/* 通用回饋彈窗 (Feedback Modal) */
let feedbackCallback = null;

function showFeedback(title, text, isCorrect, onConfirm = null) {
  const titleEl = document.getElementById('fb-title');
  const textEl = document.getElementById('fb-text');
  const btn = document.getElementById('fb-btn');
  const modal = document.getElementById('feedback-modal');
  if (titleEl) titleEl.innerText = title;
  if (textEl) textEl.innerText = text;
  feedbackCallback = onConfirm;
  if (btn) {
    if (isCorrect) {
      btn.innerText = "好！做下一題 ➡️";
      btn.style.background = "var(--secondary)";
    } else {
      btn.innerText = "再試試 🌸";
      btn.style.background = "#5A6B7C";
    }
  }
  if (modal) modal.classList.add('show');
}

function onConfirmFeedback() {
  const modal = document.getElementById('feedback-modal');
  if (modal) modal.classList.remove('show');
  if (typeof feedbackCallback === 'function') {
    const cb = feedbackCallback;
    feedbackCallback = null;
    cb();
  }
}