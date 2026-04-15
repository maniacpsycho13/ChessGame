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




...........................
// Berkeley Algorithm
let clientTimes = {};
let connectedSockets = [];

io.on("connection", (socket) => {
  connectedSockets.push(socket);

  // Ask this client for their time
  socket.emit("time_request");

  socket.on("time_response", (clientTime) => {
    clientTimes[socket.id] = clientTime;

    // Once we have time from all connected clients
    if (Object.keys(clientTimes).length === connectedSockets.length) {
      
      // Step 1: Calculate average
      const serverTime = Date.now();
      const allTimes = [serverTime, ...Object.values(clientTimes)];
      const average = allTimes.reduce((a, b) => a + b) / allTimes.length;

      // Step 2: Send each client their adjustment
      connectedSockets.forEach((s) => {
        const adjustment = average - clientTimes[s.id];
        s.emit("time_adjust", adjustment);
      });

      // Reset for next sync
      clientTimes = {};
    }
  });
});
.............................................

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
