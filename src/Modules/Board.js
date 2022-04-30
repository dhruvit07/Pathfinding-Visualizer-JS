import Node from "./Node.js";
import visualizeDijkstra from "./Algorithms/Dijkstra.js";
import recursiveDivisionMaze from "./Maze/recursiveMaze.js";
import mazeGenerationAnimations from "./animation/mazeGenerationAnimation.js";


var boardElement = document.getElementById("board");

export default function Board(height, width) {
    this.height = height;
    this.width = width;
    this.nodes = {};
    this.nodeArray = [];
    this.mouseDown = false;
    this.pressedNodeType = "normal";
    this.start = null;
    this.target = null;
    this.object = null;
    // this.keyDown = false;
    this.previouslyPressedNodeStatus = null;
    this.previouslySwitchedNode = null;
    this.drawWall = true;
    this.wallsToAnimate = [];
    this.speed = "fast";

}

Board.prototype.initialize = function () {
    this.getGrid();
    this.addEventListeners();
    recursiveDivisionMaze(this, 2, this.height - 3, 2, this.width - 3, "horizontal", false, "wall");
    mazeGenerationAnimations(this);
};

Board.prototype.createMazeOne = function(type) {
    Object.keys(this.nodes).forEach(node => {
      let random = Math.random();
      let currentHTMLNode = document.getElementById(node);
      let relevantClassNames = ["start", "target","object"]
      let randomTwo = type === "wall" ? 0.1 : 0.2;
      if (random < randomTwo && !relevantClassNames.includes(currentHTMLNode.className)) {
        if (type === "wall") {
          currentHTMLNode.className = "wall";
          this.nodes[node].nodeType = "wall";
          this.nodes[node].weight = 0;
        } else if (type === "weight") {
          currentHTMLNode.className = "unvisited weight";
          this.nodes[node].nodeType = "unvisited ";
          this.nodes[node].weight = 15;
        }
      }
    });
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
            if(r==0 && c==0){
                newNodeClass="object";
            }
            newNode = new Node(newNodeId, newNodeClass);
            boardRowArray.push(newNode);
            boardHTMLRow += `<td id="${newNodeId}" class="${newNodeClass}"></td>`;
            this.nodes[`${newNodeId}`] = newNode;
        }
        this.nodeArray.push(boardRowArray);
        boardHTML += `${boardHTMLRow}</tr>`;
    }
    boardElement.innerHTML = boardHTML;
}
Board.prototype.getNode = function (id) {
    let coordinates = id.split("-");
    let r = parseInt(coordinates[0]);
    let c = parseInt(coordinates[1]);
    return this.nodeArray[r][c];
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
                if (currentNode.nodeType === "start" || currentNode.nodeType === "target" || currentNode.nodeType === "object" ) {
                    board.pressedNodeType = currentNode.nodeType;
                } else {
                    board.pressedNodeType = "normal";
                    board.toggleNormalNodeToWall(currentNode);
                }
            }
            currentElement.onmouseup = () => {
                board.mouseDown = false;
                if (board.pressedNodeType === "target") {
                    board.target = currentId;
                } else if (board.pressedNodeType === "start") {
                    board.start = currentId;
                } else if (board.pressedNodeStatus === "object") {
                    board.object = currentId;
                }
                board.pressedNodeType = "normal";

            }
            currentElement.onmouseenter = () => {
                if (board.mouseDown && board.pressedNodeType !== "normal") {
                    board.changeSpecialNode(currentNode);
                    if (board.pressedNodeType === "target") {
                        board.target = currentId;

                    } else if (board.pressedNodeType === "start") {
                        board.start = currentId;

                    } else if (board.pressedNodeType === "object") {
                        board.object = currentId;
                    }
                } else if (board.mouseDown) {
                    board.toggleNormalNodeToWall(currentNode);
                }
            }
            currentElement.onmouseleave = () => {
                if (board.mouseDown && board.pressedNodeType !== "normal") {
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
            element.className = this.pressedNodeType;
            currentNode.nodeType = this.pressedNodeType;

            currentNode.weight = 0;
        }
    } else if (currentNode.nodeType !== this.pressedNodeType && !this.algoDone) {
        this.previouslySwitchedNode.nodeType = this.pressedNodeType;
        previousElement.className = this.pressedNodeType;
    } else if (currentNode.nodeType === this.pressedNodeType) {
        this.previouslySwitchedNode = currentNode;
        element.className = this.previouslyPressedNodeStatus;
        currentNode.nodeType = this.previouslyPressedNodeStatus;
    }
};

Board.prototype.toggleNormalNodeToWall = function (currentNode) {
    let board = this;
    let element = document.getElementById(currentNode.id);
    let relevantStatuses = ["start", "target","object"];

    if (!relevantStatuses.includes(currentNode.nodeType)) {
        if (board.drawWall) {
            element.className = currentNode.nodeType !== "wall" ?
                "wall" : "unvisited";
            currentNode.nodeType = element.className !== "wall" ?
                "unvisited" : "wall";
            currentNode.weight = 0;
        }
        else {
            element.className = currentNode.weight !== 15 ?
                "unvisited weight" : "unvisited";
            currentNode.weight = element.className !== "unvisited weight" ?
                0 : 15;     
        }
    }
};



