const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let moveHistory = []; // Track all moves

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

// New function to add move to history and update table
const addMoveToHistory = (move) => {
  const moveObj = chess.get(move.to);
  const isPawnMove = moveObj && moveObj.type === 'p';
  
  moveHistory.push({
    moveNumber: Math.ceil(moveHistory.length / 2) + 1,
    player: chess.turn() === 'w' ? 'Black' : 'White', // Previous player who made the move
    piece: moveObj ? getPieceUnicode(moveObj) : '',
    from: move.from,
    to: move.to,
    notation: move.san || `${move.from}-${move.to}`,
    isPawn: isPawnMove,
    timestamp: new Date().toLocaleTimeString()
  });
  
  updateMovesTable();
};

// New function to update the moves table
const updateMovesTable = () => {
  const tableBody = document.querySelector("#moves-table tbody");
  if (!tableBody) return;
  
  tableBody.innerHTML = "";
  
  moveHistory.forEach((move, index) => {
    const row = document.createElement("tr");
    if (move.isPawn) {
      row.classList.add("pawn-move");
    }
    
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
  
  // Scroll to bottom
  const movesContainer = document.querySelector("#moves-container");
  if (movesContainer) {
    movesContainer.scrollTop = movesContainer.scrollHeight;
  }
};

// New function to create moves table HTML
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
        <tbody>
        </tbody>
      </table>
    </div>
    <style>
      #moves-table td {
        border: 1px solid #ddd;
        padding: 6px;
        text-align: center;
      }
      #moves-table .pawn-move {
        background-color: #ffffcc;
        font-weight: bold;
      }
      #moves-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      #moves-table tr:hover {
        background-color: #e6f3ff;
      }
    </style>
  `;

  // Append it below the chessboard
  const chessboard = document.querySelector('.chessboard');
  chessboard.insertAdjacentHTML('afterend', tableHTML);
};


// Socket event handlers
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
  // Add move to history before making the move
  addMoveToHistory(move);
  chess.move(move);
  renderBoard();
});

// Initialize the game
renderBoard();

// Create the moves table when the page loads
window.addEventListener('DOMContentLoaded', () => {
  createMovesTable();
});



const showGameStatus = (message) => {
  const statusDiv = document.createElement("div");
  statusDiv.id = "game-over-overlay";
  statusDiv.innerHTML = `
    <div style="
      position: fixed; top: 50%; left: 50%; 
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85); color: white;
      padding: 30px; border-radius: 15px; text-align: center;
      z-index: 1000; font-family: sans-serif;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
    ">
      <h2 style="margin: 0 0 10px 0;">Game Over</h2>
      <p style="font-size: 1.2rem;">${message}</p>
      <button onclick="location.reload()" style="
        margin-top: 15px; padding: 10px 20px; 
        cursor: pointer; border: none; border-radius: 5px;
        background: #4CAF50; color: white; font-weight: bold;
      ">Play Again</button>
    </div>
  `;
  document.body.appendChild(statusDiv);
};


socket.on("move", (move) => {
  addMoveToHistory(move);
  chess.move(move);
  renderBoard();

  // --- CHECK FOR WIN/LOSS/DRAW ---
  if (chess.isGameOver()) {
    let message = "";
    
    if (chess.isCheckmate()) {
      // If it's checkmate, the person whose turn it IS lost.
      // So if chess.turn() is 'w', Black won.
      const winner = chess.turn() === "w" ? "Black" : "White";
      
      if ((playerRole === "w" && winner === "White") || (playerRole === "b" && winner === "Black")) {
        message = "🏆 Congratulations! You Won!";
      } else if (playerRole === null) {
        message = `${winner} wins by Checkmate!`;
      } else {
        message = "💀 Checkmate! You Lost.";
      }
    } else if (chess.isDraw()) {
      message = "🤝 Game Over - It's a Draw!";
    } else if (chess.isStalemate()) {
      message = "⌛ Game Over - Stalemate!";
    } else {
      message = "Game Over!";
    }

    showGameStatus(message);
  }
});
