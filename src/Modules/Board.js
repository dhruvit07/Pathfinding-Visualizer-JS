import Node from "./Node.js";
import visualizeDijkstra from "./Algorithms/Dijkstra.js";

var boardElement = document.getElementById("board");
let height = Math.floor(document.documentElement.clientHeight / 30);
let width = Math.floor(document.documentElement.clientWidth / 25);


export default function Board(height, width) {
    this.height = height;
    this.width = width;
    this.nodes = {};
    this.boardArray = [];
    this.mouseDown = false;
    this.pressedNodeStatus = "normal";
    this.start = null;
    this.target = null;
    this.object = null;
    this.keyDown = false;
    this.previouslyPressedNodeStatus = null;
    this.previouslySwitchedNode = null;

}

Board.prototype.initialize = function () {
    this.getGrid();
    this.addEventListeners();
};

Board.prototype.getGrid = function () {
    let boardHTML = "";
    for (let r = 0; r < this.height; r++) {
        let boardRowArray = []
        let boardHTMLRow = `<tr id="row ${r}">`;
        for (let c = 0; c < this.width; c++) {
            let newNodeId = `${r}-${c}`,
                newNodeClass,
                newNode;
            if (r === Math.floor(this.height / 2) && c === (Math.floor(this.width / 4))) {
                newNodeClass = "start";
            }
            else if (r === Math.floor(this.height / 2) && c === (Math.floor(3 * (this.width / 4)))) {
                newNodeClass = "target";
            }
            else {
                newNodeClass = "unvisited";
            }
            newNode = new Node(newNodeId, newNodeClass);
            boardRowArray.push(newNode);
            boardHTMLRow += `<td id="${newNodeId}" class="${newNodeClass}"></td>`;
            this.nodes[`${newNodeId}`] = newNode;
        }
        this.boardArray.push(boardRowArray);
        boardHTML += `${boardHTMLRow}</tr>`;
    }
    boardElement.innerHTML = boardHTML;
}
Board.prototype.getNode = function (id) {
    let coordinates = id.split("-");
    let r = parseInt(coordinates[0]);
    let c = parseInt(coordinates[1]);
    return this.boardArray[r][c];
};

Board.prototype.addEventListeners = function () {
    let board = this;
    for (let r = 0; r < board.height; r++) {
        for (let c = 0; c < board.width; c++) {
            let currentId = `${r}-${c}`;
            let currentNode = board.getNode(currentId);
            let currentElement = document.getElementById(currentId);
            currentElement.onmousedown = (e) => {
                e.preventDefault();
                board.mouseDown = true;
                if (currentNode.nodeType === "start" || currentNode.nodeType === "target" || currentNode.nodeType === "object") {
                    board.pressedNodeStatus = currentNode.nodeType;
                } else {
                    board.pressedNodeStatus = "normal";
                    board.changeNormalNode(currentNode);
                }
            }
            currentElement.onmouseup = () => {
                board.mouseDown = false;
                if (board.pressedNodeStatus === "target") {
                    board.target = currentId;
                } else if (board.pressedNodeStatus === "start") {
                    board.start = currentId;
                } else if (board.pressedNodeStatus === "object") {
                    board.object = currentId;
                }
                board.pressedNodeStatus = "normal";

            }
            currentElement.onmouseenter = () => {
                if (board.mouseDown && board.pressedNodeStatus !== "normal") {
                    board.changeSpecialNode(currentNode);
                    if (board.pressedNodeStatus === "target") {
                        board.target = currentId;
                        if (board.algoDone) {
                            // board.redoAlgorithm();
                        }
                    } else if (board.pressedNodeStatus === "start") {
                        board.start = currentId;
                        if (board.algoDone) {
                            // board.redoAlgorithm();
                        }
                    } else if (board.pressedNodeStatus === "object") {
                        board.object = currentId;
                        if (board.algoDone) {
                            // board.redoAlgorithm();
                        }
                    }
                } else if (board.mouseDown) {
                    board.changeNormalNode(currentNode);
                }
            }
            currentElement.onmouseleave = () => {
                if (board.mouseDown && board.pressedNodeStatus !== "normal") {
                    board.changeSpecialNode(currentNode);
                }
            }
        }
    }
};

Board.prototype.changeSpecialNode = function (currentNode) {
    let element = document.getElementById(currentNode.id), previousElement;
    if (this.previouslySwitchedNode) previousElement = document.getElementById(this.previouslySwitchedNode.id);
    if (currentNode.nodeType !== "target" && currentNode.nodeType !== "start" && currentNode.nodeType !== "object") {
        if (this.previouslySwitchedNode) {
            this.previouslySwitchedNode.nodeType = this.previouslyPressedNodeStatus;
            previousElement.className = this.previouslySwitchedNodeWeight === 15 ?
                "unvisited weight" : this.previouslyPressedNodeStatus;
            this.previouslySwitchedNode.weight = this.previouslySwitchedNodeWeight === 15 ?
                15 : 0;
            this.previouslySwitchedNode = null;
            this.previouslySwitchedNodeWeight = currentNode.weight;

            this.previouslyPressedNodeStatus = currentNode.nodeType;
            element.className = this.pressedNodeStatus;
            currentNode.nodeType = this.pressedNodeStatus;

            currentNode.weight = 0;
        }
    } else if (currentNode.nodeType !== this.pressedNodeStatus && !this.algoDone) {
        this.previouslySwitchedNode.nodeType = this.pressedNodeStatus;
        previousElement.className = this.pressedNodeStatus;
    } else if (currentNode.nodeType === this.pressedNodeStatus) {
        this.previouslySwitchedNode = currentNode;
        element.className = this.previouslyPressedNodeStatus;
        currentNode.nodeType = this.previouslyPressedNodeStatus;
    }
};

Board.prototype.changeNormalNode = function (currentNode) {
    let element = document.getElementById(currentNode.id);
    let relevantStatuses = ["start", "target", "object"];
    let unweightedAlgorithms = ["dfs", "bfs"]
    if (!this.keyDown) {
        if (!relevantStatuses.includes(currentNode.nodeType)) {
            element.className = currentNode.nodeType !== "wall" ?
                "wall" : "unvisited";
            currentNode.nodeType = element.className !== "wall" ?
                "unvisited" : "wall";
            currentNode.weight = 0;
        }
    } else if (this.keyDown === 87 && !unweightedAlgorithms.includes(this.currentAlgorithm)) {
        if (!relevantStatuses.includes(currentNode.nodeType)) {
            element.className = currentNode.weight !== 15 ?
                "unvisited weight" : "unvisited";
            currentNode.weight = element.className !== "unvisited weight" ?
                0 : 15;
            currentNode.nodeType = "unvisited";
        }
    }
};

let board = new Board(height, width);
console.log(board.boardArray);

board.initialize();

