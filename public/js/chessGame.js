const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let moveHistory = [];

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = colIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: colIndex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => e.preventDefault());

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

// ── Show game over overlay ──────────────────────────────────────────────────
const showGameOverMessage = (message) => {
  const existing = document.getElementById("game-over-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "game-over-overlay";

  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.75) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
  `;

  overlay.innerHTML = `
    <div style="
      background: #fff;
      border-radius: 16px;
      padding: 48px 56px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      max-width: 400px;
      width: 90%;
    ">
      <div style="font-size: 64px; margin-bottom: 12px;">♟️</div>
      <h2 style="font-size: 30px; margin: 0 0 12px; color: #111; font-weight: bold;">Game Over</h2>
      <p style="font-size: 20px; color: #444; margin: 0 0 28px; line-height: 1.4;">${message}</p>
      <button
        onclick="document.getElementById('game-over-overlay').remove()"
        style="
          padding: 12px 36px;
          font-size: 16px;
          background: #222;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          letter-spacing: 0.5px;
        "
        onmouseover="this.style.background='#444'"
        onmouseout="this.style.background='#222'"
      >Close</button>
    </div>
    <style>
      @keyframes popIn {
        from { transform: scale(0.8); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(overlay);
  console.log("✅ Game over overlay shown:", message);
};

// ── Check game state after every move ──────────────────────────────────────
const checkGameOver = () => {
  const inCheckmate    = chess.isCheckmate?.()            ?? chess.in_checkmate?.();
  const inDraw         = chess.isDraw?.()                 ?? chess.in_draw?.();
  const inStalemate    = chess.isStalemate?.()            ?? chess.in_stalemate?.();
  const inThreefold    = chess.isThreefoldRepetition?.()  ?? chess.in_threefold_repetition?.();
  const inInsufficient = chess.isInsufficientMaterial?.() ?? chess.insufficient_material?.();

  console.log("🔍 Game over check:", { inCheckmate, inDraw, inStalemate });

  if (inCheckmate) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    showGameOverMessage(`🏆 ${winner} wins by Checkmate!`);
  } else if (inStalemate) {
    showGameOverMessage("🤝 Draw by Stalemate!");
  } else if (inThreefold) {
    showGameOverMessage("🤝 Draw by Threefold Repetition!");
  } else if (inInsufficient) {
    showGameOverMessage("🤝 Draw by Insufficient Material!");
  } else if (inDraw) {
    showGameOverMessage("🤝 The game is a Draw!");
  }
};

// ── Move history ────────────────────────────────────────────────────────────
const addMoveToHistory = (move) => {
  const moveObj = chess.get(move.to);
  const isPawnMove = moveObj && moveObj.type === "p";

  moveHistory.push({
    moveNumber: Math.ceil(moveHistory.length / 2) + 1,
    player: chess.turn() === "w" ? "Black" : "White",
    piece: moveObj ? getPieceUnicode(moveObj) : "",
    from: move.from,
    to: move.to,
    notation: move.san || `${move.from}-${move.to}`,
    isPawn: isPawnMove,
    timestamp: new Date().toLocaleTimeString(),
  });

  updateMovesTable();
};

const updateMovesTable = () => {
  const tableBody = document.querySelector("#moves-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  moveHistory.forEach((move, index) => {
    const row = document.createElement("tr");
    if (move.isPawn) row.classList.add("pawn-move");

    row.innerHTML = `
      <td>${Math.floor(index / 2) + 1}</td>
      <td>${move.player}</td>
      <td>${move.piece}</td>
      <td>${move.from}</td>
      <td>${move.to}</td>
      <td>${move.notation}</td>
      <td>${move.timestamp}</td>
    `;

    tableBody.appendChild(row);
  });

  const movesContainer = document.querySelector("#moves-container");
  if (movesContainer) movesContainer.scrollTop = movesContainer.scrollHeight;
};

const createMovesTable = () => {
  const tableHTML = `
    <div id="moves-container" style="
      position: absolute;
      top: 620px;
      left: 50%;
      transform: translateX(-50%);
      width: 400px;
      max-height: 500px;
      overflow-y: auto;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <h3 style="margin-top: 0; text-align: center; color: #333;">Move History</h3>
      <table id="moves-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Move#</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Player</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Piece</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">From</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">To</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Notation</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Time</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <style>
      #moves-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
      #moves-table .pawn-move { background-color: #ffffcc; font-weight: bold; }
      #moves-table tr:nth-child(even) { background-color: #f9f9f9; }
      #moves-table tr:hover { background-color: #e6f3ff; }
    </style>
  `;

  const chessboard = document.querySelector(".chessboard");
  chessboard.insertAdjacentHTML("afterend", tableHTML);
};

// ── Socket event handlers ───────────────────────────────────────────────────
socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", (move) => {
  addMoveToHistory(move);
  chess.move(move);
  renderBoard();
  setTimeout(() => checkGameOver(), 100); // ✅ slight delay ensures state is settled
});

// ── Init ────────────────────────────────────────────────────────────────────
renderBoard();

window.addEventListener("DOMContentLoaded", () => {
  createMovesTable();
});
