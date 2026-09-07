/* ========================================================
   2. 數獨模組 (載入自 sudokusource.xml - 1000 題)
   ======================================================== */
let sudokuList = [];
let currentSudokuIdx = 0;
let currentSudokuState = [];
let currentSolutionState = [];
let initialCluesState = [];
let selectedRow = -1;
let selectedCol = -1;

// 備用預設數獨 (防止無網絡/本地檔案fetch問題)
const fallbackSudoku = [
  {
    id: "1",
    clues: "630000416000300210015003000160000052",
    solution: "632451416523345216215643523164164352"
  }
];

async function fetchSudokuXML() {
  try {
    const res = await fetch('sudokusource.xml');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const pNodes = xmlDoc.getElementsByTagName('puzzle');

    const loaded = [];
    for (let i = 0; i < pNodes.length; i++) {
      const id = pNodes[i].getAttribute('id') || (i + 1);
      const clues = pNodes[i].getElementsByTagName('clues')[0]?.textContent.trim() || '';
      const solution = pNodes[i].getElementsByTagName('solution')[0]?.textContent.trim() || '';
      if (clues.length === 36 && solution.length === 36) {
        loaded.push({ id, clues, solution });
      }
    }

    if (loaded.length > 0) {
      sudokuList = loaded;
    } else {
      sudokuList = fallbackSudoku;
    }
  } catch (err) {
    console.warn('載入 sudokusource.xml 失敗，使用備用題目:', err);
    sudokuList = fallbackSudoku;
  }

  initSudokuSelector();
  loadCurrentSudokuPuzzle();
}

function initSudokuSelector() {
  const select = document.getElementById('sudoku-select');
  if (!select) return;
  select.innerHTML = '';
  try {
    const saved = localStorage.getItem('grandma_sudoku_idx');
    if (saved !== null) {
      currentSudokuIdx = parseInt(saved, 10) || 0;
      if (currentSudokuIdx >= sudokuList.length) currentSudokuIdx = 0;
    }
  } catch (e) {}

  // 為避免 1000 項下拉選單太長，建置每 10 題或整百題的跳題快速清單，亦可跳指定題
  for (let i = 0; i < sudokuList.length; i += 10) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `第 ${i + 1} - ${Math.min(i + 10, sudokuList.length)} 題`;
    if (currentSudokuIdx >= i && currentSudokuIdx < i + 10) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectSudoku(val) {
  currentSudokuIdx = parseInt(val, 10);
  saveSudokuProgress();
  loadCurrentSudokuPuzzle();
}

function saveSudokuProgress() {
  try {
    localStorage.setItem('grandma_sudoku_idx', currentSudokuIdx);
  } catch (e) {}
}

function loadCurrentSudokuPuzzle() {
  if (!sudokuList[currentSudokuIdx]) return;
  const p = sudokuList[currentSudokuIdx];

  const progressLabel = document.getElementById('sudoku-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `第 ${currentSudokuIdx + 1} / ${sudokuList.length} 題`;
  }
  
  // 更新下拉選單
  const sel = document.getElementById('sudoku-select');
  if (sel) {
    for (let opt of sel.options) {
      const base = parseInt(opt.value, 10);
      if (currentSudokuIdx >= base && currentSudokuIdx < base + 10) {
        opt.selected = true;
        break;
      }
    }
  }

  // 解析 36 字元字串為 6x6 陣列
  initialCluesState = [];
  currentSudokuState = [];
  currentSolutionState = [];

  for (let r = 0; r < 6; r++) {
    const rowClue = [];
    const rowCurr = [];
    const rowSol = [];
    for (let c = 0; c < 6; c++) {
      const idx = r * 6 + c;
      const clueVal = parseInt(p.clues[idx], 10) || 0;
      const solVal = parseInt(p.solution[idx], 10) || 0;
      rowClue.push(clueVal);
      rowCurr.push(clueVal);
      rowSol.push(solVal);
    }
    initialCluesState.push(rowClue);
    currentSudokuState.push(rowCurr);
    currentSolutionState.push(rowSol);
  }

  selectedRow = -1;
  selectedCol = -1;
  renderSudokuGrid();
}

function renderSudokuGrid() {
  const grid = document.getElementById('sudoku-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const val = currentSudokuState[r][c];
      const isGiven = initialCluesState[r][c] !== 0;
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell' + (isGiven ? ' given' : (val !== 0 ? ' user-filled' : ''));
      if (r === selectedRow && c === selectedCol) cell.classList.add('selected');
      cell.innerText = val !== 0 ? val : '';
      cell.onclick = () => selectCell(r, c, isGiven);
      grid.appendChild(cell);
    }
  }
}

function selectCell(r, c, isGiven) {
  if (isGiven) {
    selectedRow = -1;
    selectedCol = -1;
  } else {
    selectedRow = r;
    selectedCol = c;
  }
  renderSudokuGrid();
}

function inputNumber(num) {
  if (selectedRow === -1 || selectedCol === -1) return;
  if (initialCluesState[selectedRow][selectedCol] !== 0) return;

  // 擦除動作
  if (num === 0) {
    currentSudokuState[selectedRow][selectedCol] = 0;
    renderSudokuGrid();
    return;
  }

  // 即時核對：立即檢查填入的數字是否等於答案
  const correctNum = currentSolutionState[selectedRow][selectedCol];
  if (num === correctNum) {
    // 答對：填入並發出悅耳提示音
    currentSudokuState[selectedRow][selectedCol] = num;
    playChime(true);
    renderSudokuGrid();

    // 檢查是否整盤所有空格均已填妥
    let isAllFilled = true;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (currentSudokuState[r][c] === 0) {
          isAllFilled = false;
          break;
        }
      }
      if (!isAllFilled) break;
    }

    if (isAllFilled) {
      // 全部答對：奏響號角，取消選取，彈出專屬讚賞視窗並引導去新題目
      playFanfare();
      selectedRow = -1;
      selectedCol = -1;
      renderSudokuGrid();
      setTimeout(() => {
        showSudokuVictoryPopup();
      }, 400);
    }
  } else {
    // 答錯即刻彈 POPUP 提佢，不留錯字在格內
    playChime(false);
    showFeedback("差少少，留意呢格！🌸", `呢格填「${num}」唔係好啱，試下填其他數字諗一諗！`, false);
  }
}

function resetSudoku() {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      currentSudokuState[r][c] = initialCluesState[r][c];
    }
  }
  selectedRow = -1;
  selectedCol = -1;
  renderSudokuGrid();
}

function showSudokuVictoryPopup() {
  const titleEl = document.getElementById('sudoku-victory-title');
  const bodyEl = document.getElementById('sudoku-victory-body');
  const popup = document.getElementById('sudoku-victory-popup');
  if (titleEl) titleEl.innerText = `太叻喇！第 ${currentSudokuIdx + 1} 題全部答啱！🏆`;
  if (bodyEl) {
    bodyEl.innerText = `婆婆好犀利呀！第 ${currentSudokuIdx + 1} 題 6×6 數獨全部填啱晒，頭腦好精明！現在為您前進去下一題！`;
  }
  if (popup) popup.classList.add('show');
}

// 完成後去下一題，唔停留喺同一個位
function onSudokuGoNext() {
  const popup = document.getElementById('sudoku-victory-popup');
  if (popup) popup.classList.remove('show');
  nextSudoku();
  playChime(true);
}

// 完成後隨機抽新題目
function onSudokuGoRandom() {
  const popup = document.getElementById('sudoku-victory-popup');
  if (popup) popup.classList.remove('show');
  randomSudoku();
  playChime(true);
}

function prevSudoku() {
  if (currentSudokuIdx > 0) {
    currentSudokuIdx--;
    saveSudokuProgress();
    loadCurrentSudokuPuzzle();
  }
}

function nextSudoku() {
  if (currentSudokuIdx < sudokuList.length - 1) {
    currentSudokuIdx++;
    saveSudokuProgress();
    loadCurrentSudokuPuzzle();
  }
}

function randomSudoku() {
  const rand = Math.floor(Math.random() * sudokuList.length);
  currentSudokuIdx = rand;
  saveSudokuProgress();
  loadCurrentSudokuPuzzle();
  playChime(true);
}

// 初始化數獨題目
fetchSudokuXML();