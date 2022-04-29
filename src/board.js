import Node from "./Modules/Node.js";
var boardElement = document.getElementById("board");
let height = Math.floor(document.documentElement.clientHeight/ 30 );
let width = Math.floor(document.documentElement.clientWidth /25);


function Board(height, width) {
    this.height = height;
    this.width = width;
  }
  
  Board.prototype.getGrid = function() {
    let boardHTML = "";
    for (let r = 0; r < height; r++) {
        let boardRowArray = [];
        let boardHTMLRow = `<tr id="row ${r}">`;
        for (let c = 0; c < width; c++) {
            let newNodeId = `${r}-${c}`,
            newNodeClass,
            newNode;
            if(r === Math.floor(height/2) && c === (Math.floor(width/4)))
            {
                newNodeClass = "start";
            }
            else if(r === Math.floor(height/2) && c === (Math.floor(3* (width/4))))
            {
                newNodeClass = "target";
            }
            else{
                newNodeClass = "unvisited";
            }
               

            newNode = new Node(newNodeId, newNodeClass);
            boardRowArray.push(newNode);
            boardHTMLRow += `<td id="${newNodeId}" class="${newNodeClass}"></td>`;
            // this.nodes[`${newNodeId}`] = newNode;
        }
        this.boardArray.push(boardRowArray);
        boardHTML += `${boardHTMLRow}</tr>`;
    }
    boardElement.innerHTML = boardHTML;
}

let board = new Board(height,width);
board.getGrid();

 