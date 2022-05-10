let boardElement = document.getElementById("board");

function Node(id, nodeType) {
  this.id = id;
  this.nodeType = nodeType;
  this.distance = Infinity;
  this.previousNode = null;
  this.isVisited = false;
  this.weight = 0;
  this.path = null;
  this.direction = null;
  this.storedDirection = null;
  
  this.totalDistance = Infinity;
  this.heuristicDistance = null;
  this.weight = 0;
  this.relatesToObject = false;
  this.overwriteObjectRelation = false;

  this.otherid = id;
  this.otherstatus = status;
  this.otherpreviousNode = null;
  this.otherpath = null;
  this.otherdirection = null;
  this.otherstoredDirection = null;
  this.otherdistance = Infinity;
  this.otherweight = 0;
  this.otherrelatesToObject = false;
  this.otheroverwriteObjectRelation = false;
}
  function Board(height, width) {
    this.height = height;
    this.width = width;
    this.nodes = {};
    this.nodeArray = [];
    this.mouseDown = false;
    this.pressedNodeType = "normal";
    this.objectNodesToAnimate = [];
    this.shortestPathNodesToAnimate = [];
    this.objectShortestPathNodesToAnimate = [];
    this.previouslySwitchedNodeWeight = 0;
    this.start = null;
    this.target = null;
    this.object = null;
    this.keyDown = false;
    this.algoDone = false;
    this.previouslyPressedNodeStatus = null;
    this.previouslySwitchedNode = null;
    this.drawWall = true;
    this.wallsToAnimate = [];
    this.nodesToAnimate = [];
    this.speed = "fast";
    this.currentAlgorithm = "";
    this.currentHeuristic = null;
    this.numberOfObjects = 0;
    this.isObject = false;
    this.buttonsOn = false;
    this.speed = "fast";


}


let height = Math.floor(document.documentElement.clientHeight / 50);
let width = Math.floor(document.documentElement.clientWidth / 40);
let board = new Board(height, width);

function clear() {
  Object.keys(board.nodes).forEach(id => {
    let currentNode = board.nodes[id];
    // console.log(currentNode);
    let currentHTMLNode = document.getElementById(id);
    if (currentNode.nodeType === "start") {
      currentHTMLNode.className = "start";
      currentNode.nodeType = "start";
    } else if (currentNode.nodeType === "target") {
      currentHTMLNode.className = "target";
      currentNode.nodeType = "target"
    } else {
      currentHTMLNode.className = "unvisited";
      currentNode.nodeType = "unvisited";
    }
    currentNode.previousNode = null;
    currentNode.path = null;
    currentNode.direction = null;
    currentNode.storedDirection = null;
    currentNode.distance = Infinity;
    currentNode.totalDistance = Infinity;
    currentNode.heuristicDistance = null;
    currentNode.weight = 0;
    currentNode.relatesToObject = false;
    currentNode.overwriteObjectRelation = false;
    board.object = null;
  })
}
Board.prototype.initialize = function () {
    this.getGrid();
    this.addEventListeners();
    
};

Board.prototype.createMazeOne = function(type) {
    Object.keys(this.nodes).forEach(node => {
      let random = Math.random();
      let currentHTMLNode = document.getElementById(node);
      let relevantClassNames = ["start", "target","object"]
      let randomTwo = type === "wall" ? 0.25 : 0.35;
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
                
            if (r === Math.floor(this.height / 2) && c === (Math.floor(1.5 *(this.width / 4)))) {
                this.start = `${newNodeId}`;
                newNodeClass = "start";
            }
            else if (r === Math.floor(this.height / 2) && c === (Math.floor(2.5 * (this.width / 4)))) {
                newNodeClass = "target";
                this.target = `${newNodeId}`;

            }
            else {
                newNodeClass = "unvisited";

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
           
            currentElement.addEventListener("dblclick", function(){
                

                if (board.pressedNodeType === "object") {
                    console.log("Hello");
                    let noe = document.getElementById(currentId);
                    noe.className = "unvisited";
                    currentNode.nodeType = "normal";
                    board.numberOfObjects = 0;
                }
            });
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
        // console.log(currentNode.nodeType);  
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
      // console.log(currentNode.nodeType);
        this.previouslySwitchedNode.nodeType = this.pressedNodeType;
        previousElement.className = this.pressedNodeType;
    } else if (currentNode.nodeType === this.pressedNodeType) {
        // console.log(currentNode.nodeType);
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

Board.prototype.reset = function(objectNotTransparent) {
    this.nodes[this.start].nodeType = "start";
    document.getElementById(this.start).className = "startTransparent";
    this.nodes[this.target].nodeType = "target";
    if (this.object) {
      this.nodes[this.object].nodeType = "object";
      if (objectNotTransparent) {
        document.getElementById(this.object).className = "visitedObjectNode";
      } else {
        // document.getElementById(this.object).className = "objectTransparent";
      }
    }
  };

Board.prototype.drawShortestPathTimeout = function(targetNodeId, startNodeId, type, object) {
    let board = this;
    let currentNode;
    let secondCurrentNode;
    let currentNodesToAnimate;
  
    if (board.currentAlgorithm !== "bidirectional") {
      currentNode = board.nodes[board.nodes[targetNodeId].previousNode];
      if (object) {
        board.objectShortestPathNodesToAnimate.push("object");
        currentNodesToAnimate = board.objectShortestPathNodesToAnimate.concat(board.shortestPathNodesToAnimate);
      } else {
        currentNodesToAnimate = [];
        while (currentNode.id !== startNodeId) {
          currentNodesToAnimate.unshift(currentNode);
          currentNode = board.nodes[currentNode.previousNode];
        }
      }
    } else {
      if (board.middleNode !== board.target && board.middleNode !== board.start) {
        currentNode = board.nodes[board.nodes[board.middleNode].previousNode];
        secondCurrentNode = board.nodes[board.nodes[board.middleNode].otherpreviousNode];
        if (secondCurrentNode.id === board.target) {
          board.nodes[board.target].direction = getDistance(board.nodes[board.middleNode], board.nodes[board.target])[2];
        }
        if (object) {
  
        } else {
          currentNodesToAnimate = [];
          board.nodes[board.middleNode].direction = getDistance(currentNode, board.nodes[board.middleNode])[2];
          while (currentNode.id !== startNodeId) {
            currentNodesToAnimate.unshift(currentNode);
            currentNode = board.nodes[currentNode.previousNode];
          }
          currentNodesToAnimate.push(board.nodes[board.middleNode]);
          while (secondCurrentNode.id !== targetNodeId) {
            if (secondCurrentNode.otherdirection === "left") {
              secondCurrentNode.direction = "right";
            } else if (secondCurrentNode.otherdirection === "right") {
              secondCurrentNode.direction = "left";
            } else if (secondCurrentNode.otherdirection === "up") {
              secondCurrentNode.direction = "down";
            } else if (secondCurrentNode.otherdirection === "down") {
              secondCurrentNode.direction = "up";
            }
            currentNodesToAnimate.push(secondCurrentNode);
            if (secondCurrentNode.otherpreviousNode === targetNodeId) {
              board.nodes[board.target].direction = getDistance(secondCurrentNode, board.nodes[board.target])[2];
            }
            secondCurrentNode = board.nodes[secondCurrentNode.otherpreviousNode]
          }
      }
    } else {
      currentNodesToAnimate = [];
      let target = board.nodes[board.target];
      currentNodesToAnimate.push(board.nodes[target.previousNode], target);
    }
  
  }
timeout(0);

function timeout(index) {
  if (!currentNodesToAnimate.length) currentNodesToAnimate.push(board.nodes[board.start]);
  setTimeout(function () {
    if (index === 0) {
      shortestPathChange(currentNodesToAnimate[index]);
    } else if (index < currentNodesToAnimate.length) {
      shortestPathChange(currentNodesToAnimate[index], currentNodesToAnimate[index - 1]);
    } else if (index === currentNodesToAnimate.length) {
      shortestPathChange(board.nodes[board.target], currentNodesToAnimate[index - 1], "isActualTarget");
    }
    if (index > currentNodesToAnimate.length) {
    //   board.toggleButtons();
      return;
    }
    timeout(index + 1);
  }, 40)
}





//=============================================================================================
// Algorithms


function shortestPathChange(currentNode, previousNode, isActualTarget) {
    if (currentNode === "object") {
      let element = document.getElementById(board.object);
      element.className = "objectTransparent";
    } else if (currentNode.id !== board.start) {
      if (currentNode.id !== board.target || currentNode.id === board.target && isActualTarget) {
        let currentHTMLNode = document.getElementById(currentNode.id);
        if (type === "unweighted") {
          currentHTMLNode.className = "shortest-path-unweighted";
        } else {
          let direction;
          if (currentNode.relatesToObject && !currentNode.overwriteObjectRelation && currentNode.id !== board.target) {
            direction = "storedDirection";
            currentNode.overwriteObjectRelation = true;
          } else {
            direction = "direction";
          }
          if (currentNode[direction] === "up") {
            currentHTMLNode.className = "shortest-path-up";
          } else if (currentNode[direction] === "down") {
            
            currentHTMLNode.className = "shortest-path-down";
          } else if (currentNode[direction] === "right") {
            
            currentHTMLNode.className = "shortest-path-right";
          } else if (currentNode[direction] === "left") {
            
            currentHTMLNode.className = "shortest-path-left";
          } else {
            
            currentHTMLNode.className = "shortest-path";
          }
        }
      }
    }
    if (previousNode) {
      if (previousNode !== "object" && previousNode.id !== board.target && previousNode.id !== board.start) {
        let previousHTMLNode = document.getElementById(previousNode.id);
        previousHTMLNode.className = previousNode.weight === 15 ? "shortest-path weight" : "shortest-path";
      }
    } else {
      let element = document.getElementById(board.start);
      element.className = "startTransparent";
    }
  }

};

Board.prototype.addShortestPath = function(targetNodeId, startNodeId, object) {
    let currentNode = this.nodes[this.nodes[targetNodeId].previousNode];
    if (object) {
      while (currentNode.id !== startNodeId) {
        this.objectShortestPathNodesToAnimate.unshift(currentNode);
        currentNode.relatesToObject = true;
        currentNode = this.nodes[currentNode.previousNode];
      }
    } else {
      while (currentNode.id !== startNodeId) {
        this.shortestPathNodesToAnimate.unshift(currentNode);
        currentNode = this.nodes[currentNode.previousNode];
      }
    }
  };
  
  Board.prototype.clearNodeStatuses = function() {
    Object.keys(this.nodes).forEach(id => {
      let currentNode = this.nodes[id];
      currentNode.previousNode = null;
      currentNode.distance = Infinity;
      currentNode.totalDistance = Infinity;
      currentNode.heuristicDistance = null;
      currentNode.storedDirection = currentNode.direction;
      currentNode.direction = null;
      let relevantStatuses = ["wall", "start", "target", "object"];
      if (!relevantStatuses.includes(currentNode.status)) {
        currentNode.status = "unvisited";
      }
    })
  };

  board.initialize();
let success = "";

document.getElementById("startButtonDijkstra").onclick = function () {

  board.currentAlgorithm = "dijkstra";
  board.currentHeuristic = "";

  if (board.currentAlgorithm === "dijkstra") {
    if (!board.numberOfObjects) {
      console.log("hello");
      success = weightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic, board);
      launchAnimations(board, success, "weighted");
    }
    else {
      board.isObject = true;
      success = weightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic);
      launchAnimations(board, success, "weighted", "object", board.currentAlgorithm, board.currentHeuristic);
    }
  }

};

document.getElementById("startButtonBidirectional").onclick = function () {
  board.currentAlgorithm = "bidirectional";
  board.currentHeuristic = "manhattanDistance";
  if (board.currentAlgorithm === "bidirectional") {
    success = bidirectional(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic, board);
    launchAnimations(board, success, "weighted");
  }
};


document.getElementById("startButtonBFS").onclick = function () {

  board.currentAlgorithm = "bfs";
  board.currentHeuristic = "";
  if (!board.numberOfObjects) {
    success = unweightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, "bfs");
    launchAnimations(board, success, "unweighted");
  } else {
    board.isObject = true;
    success = unweightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, "bsf");
    launchAnimations(board, success, "unweighted", "object", board.currentAlgorithm);
  }

};

document.getElementById("startButtonDFS").onclick = function () {

  board.currentAlgorithm = "dfs";
  board.currentHeuristic = "";
  if (!board.numberOfObjects) {
    success = unweightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, "dfs");
    launchAnimations(board, success, "unweighted");
  } else {
    board.isObject = true;
    success = unweightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, "dfs");
    launchAnimations(board, success, "unweighted", "object", board.currentAlgorithm);
  }

};

document.getElementById("startButtonCreateMazeTwo").onclick = function () {
  clear();

  recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false, "wall");
  mazeGenerationAnimations(board);
};

document.getElementById("startButtonCreateMazeThree").onclick = function () {
  clear();

  recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false);
  mazeGenerationAnimations(board);

};
document.getElementById("startButtonCreateMazeFour").onclick = function () {
  clear();

  recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "vectical", false);
  mazeGenerationAnimations(board);

};
document.getElementById("startButtonCreateMazeOne").onclick = function () {
  clear();


  board.createMazeOne("wall");

};
document.getElementById("startButtonCreateMazeWeights").onclick = function () {
  clear();

  board.createMazeOne("weight");

};
document.getElementById("startStairDemonstration").onclick = function () {
  clear();

  recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "vectical", false, "weight");
  mazeGenerationAnimations(board);

};
document.getElementById("startButtonWeightToggle").onclick = function () {
  if (board.drawWall === false) {
    document.getElementById("startButtonWeightToggle").innerHTML = '<a href="#">Add Weight</a></li>';

    board.drawWall = true;
  }
  else {
    document.getElementById("startButtonWeightToggle").innerHTML = '<a href="#">Add Wall</a></li>';

    board.drawWall = false;
  }
};
document.getElementById("startButtonAddObject").onclick = function () {

  if (board.object === null) {
    let newNodeId = `${3}-${12}`;
    board.object = `${newNodeId}`;
    board.numberOfObjects += 1;
    let noe = document.getElementById(newNodeId);
    noe.className = "object";
    board.nodeArray[3][12].nodeType = "object";
  }

};


document.getElementById("startButtonClearBoard").onclick = function () {
  clear();

};
  function getDistance(nodeOne, nodeTwo) {
    let currentCoordinates = nodeOne.id.split("-");
    let targetCoordinates = nodeTwo.id.split("-");
    let x1 = parseInt(currentCoordinates[0]);
    let y1 = parseInt(currentCoordinates[1]);
    let x2 = parseInt(targetCoordinates[0]);
    let y2 = parseInt(targetCoordinates[1]);
    if (x2 < x1) {
      if (nodeOne.direction === "up") {
        return [1, ["f"], "up"];
      } else if (nodeOne.direction === "right") {
        return [2, ["l", "f"], "up"];
      } else if (nodeOne.direction === "left") {
        return [2, ["r", "f"], "up"];
      } else if (nodeOne.direction === "down") {
        return [3, ["r", "r", "f"], "up"];
      }
    } else if (x2 > x1) {
      if (nodeOne.direction === "up") {
        return [3, ["r", "r", "f"], "down"];
      } else if (nodeOne.direction === "right") {
        return [2, ["r", "f"], "down"];
      } else if (nodeOne.direction === "left") {
        return [2, ["l", "f"], "down"];
      } else if (nodeOne.direction === "down") {
        return [1, ["f"], "down"];
      }
    }
    if (y2 < y1) {
      if (nodeOne.direction === "up") {
        return [2, ["l", "f"], "left"];
      } else if (nodeOne.direction === "right") {
        return [3, ["l", "l", "f"], "left"];
      } else if (nodeOne.direction === "left") {
        return [1, ["f"], "left"];
      } else if (nodeOne.direction === "down") {
        return [2, ["r", "f"], "left"];
      }
    } else if (y2 > y1) {
      if (nodeOne.direction === "up") {
        return [2, ["r", "f"], "right"];
      } else if (nodeOne.direction === "right") {
        return [1, ["f"], "right"];
      } else if (nodeOne.direction === "left") {
        return [3, ["r", "r", "f"], "right"];
      } else if (nodeOne.direction === "down") {
        return [2, ["l", "f"], "right"];
      }
    }
  }
  
 

function recursiveDivisionMaze(board, rowStart, rowEnd, colStart, colEnd, orientation, surroundingWalls, type) {
    if (rowEnd < rowStart || colEnd < colStart) {
      return;
    }
    if (!surroundingWalls) {
      let relevantIds = [board.start, board.target];
      if (board.object) relevantIds.push(board.object);
      Object.keys(board.nodes).forEach(node => {
        if (!relevantIds.includes(node)) {
          let r = parseInt(node.split("-")[0]);
          let c = parseInt(node.split("-")[1]);
          if (r === 0 || c === 0 || r === board.height - 1 || c === board.width - 1) {
            let currentHTMLNode = document.getElementById(node);
            board.wallsToAnimate.push(currentHTMLNode);
            if (type === "wall") {
              board.nodes[node].nodeType = "wall";
              board.nodes[node].weight = 0;
            } else if (type === "weight") {
              board.nodes[node].nodeType = "unvisited";
              board.nodes[node].weight = 15;
            }
          }
        }
      });
      surroundingWalls = true;
    }
    if (orientation === "horizontal") {
      let possibleRows = [];
      for (let number = rowStart; number <= rowEnd; number += 2) {
        possibleRows.push(number);
      }
      let possibleCols = [];
      for (let number = colStart - 1; number <= colEnd + 1; number += 2) {
        possibleCols.push(number);
      }
      let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
      let randomColIndex = Math.floor(Math.random() * possibleCols.length);
      let currentRow = possibleRows[randomRowIndex];
      let colRandom = possibleCols[randomColIndex];
      Object.keys(board.nodes).forEach(node => {
        let r = parseInt(node.split("-")[0]);
        let c = parseInt(node.split("-")[1]);
        if (r === currentRow && c !== colRandom && c >= colStart - 1 && c <= colEnd + 1) {
          let currentHTMLNode = document.getElementById(node);
          if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target" && currentHTMLNode.className !== "object") {
            board.wallsToAnimate.push(currentHTMLNode);
            if (type === "wall") {
              board.nodes[node].nodeType = "wall";
              board.nodes[node].weight = 0;
            } else if (type === "weight") {
              board.nodes[node].nodeType = "unvisited";
              board.nodes[node].weight = 15;
            }        }
        }
      });
      if (currentRow - 2 - rowStart > colEnd - colStart) {
        recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, orientation, surroundingWalls, type);
      } else {
        recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, "vertical", surroundingWalls, type);
      }
      if (rowEnd - (currentRow + 2) > colEnd - colStart) {
        recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, orientation, surroundingWalls, type);
      } else {
        recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls, type);
      }
    } else {
      let possibleCols = [];
      for (let number = colStart; number <= colEnd; number += 2) {
        possibleCols.push(number);
      }
      let possibleRows = [];
      for (let number = rowStart - 1; number <= rowEnd + 1; number += 2) {
        possibleRows.push(number);
      }
      let randomColIndex = Math.floor(Math.random() * possibleCols.length);
      let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
      let currentCol = possibleCols[randomColIndex];
      let rowRandom = possibleRows[randomRowIndex];
      Object.keys(board.nodes).forEach(node => {
        let r = parseInt(node.split("-")[0]);
        let c = parseInt(node.split("-")[1]);
        if (c === currentCol && r !== rowRandom && r >= rowStart - 1 && r <= rowEnd + 1) {
          let currentHTMLNode = document.getElementById(node);
          if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target" && currentHTMLNode.className !== "object") {
            board.wallsToAnimate.push(currentHTMLNode);
            if (type === "wall") {
              board.nodes[node].nodeType = "wall";
              board.nodes[node].weight = 0;
            } else if (type === "weight") {
              board.nodes[node].nodeType = "unvisited";
              board.nodes[node].weight = 15;
            }        }
        }
      });
      if (rowEnd - rowStart > currentCol - 2 - colStart) {
        recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "horizontal", surroundingWalls, type);
      } else {
        recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, orientation, surroundingWalls, type);
      }
      if (rowEnd - rowStart > colEnd - (currentCol + 2)) {
        recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, "horizontal", surroundingWalls, type);
      } else {
        recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, orientation, surroundingWalls, type);
      }
    }
  };

  function launchAnimations(board, success, type, object, algorithm, heuristic) {
  let nodes = object ? board.objectNodesToAnimate.slice(0) : board.nodesToAnimate.slice(0);
  let speed = 25;
  let time = 0;
  let shortestNodes;
  function timeout(index) {
    window.setTimeout(function () {

      if (index === nodes.length) {
        if (object) {
          board.objectNodesToAnimate = [];
          if (success) {
            board.addShortestPath(board.object, board.start, "object");
            board.clearNodeStatuses();
            let newSuccess;
            if (board.currentAlgorithm === "bidirectional") {

            } else {
              if (type === "weighted") {
                newSuccess = weightedSearchAlgorithm(board.nodes, board.object, board.target, board.nodesToAnimate, board.nodeArray, algorithm, heuristic);
              } else {
                newSuccess = unweightedSearchAlgorithm(board.nodes, board.object, board.target, board.nodesToAnimate, board.nodeArray, algorithm);
              }
            }
            document.getElementById(board.object).className = "visitedObjectNode";
            launchAnimations(board, newSuccess, type);
            return;
          } else {
            window.alert("No Path Found");
            board.reset();
            board.toggleButtons();
            return;
          }
        } else {
          board.nodesToAnimate = [];
          if (success) {
            if (document.getElementById(board.target).className !== "visitedTargetNodeBlue") {
              document.getElementById(board.target).className = "visitedTargetNodeBlue";
            }
            if (board.isObject) {
              board.addShortestPath(board.target, board.object);
              board.drawShortestPathTimeout(board.target, board.object, type, "object");
              board.objectShortestPathNodesToAnimate = [];
              board.shortestPathNodesToAnimate = [];
              board.reset("objectNotTransparent");
            } else {
              board.drawShortestPathTimeout(board.target, board.start, type);
              board.objectShortestPathNodesToAnimate = [];
              board.shortestPathNodesToAnimate = [];
              board.reset();
            }
            shortestNodes = board.objectShortestPathNodesToAnimate.concat(board.shortestPathNodesToAnimate);
            return;
          } else {
            window.alert("No Path Found");
            board.reset();
            board.toggleButtons();
            return;
          }
        }
      } else if (index === 0) {
        if (object) {
          document.getElementById(board.start).className = "visitedStartNodePurple";
        } else {
          if (document.getElementById(board.start).className !== "visitedStartNodePurple") {
            document.getElementById(board.start).className = "visitedStartNodeBlue";
          }
        }
        if (board.currentAlgorithm === "bidirectional") {
          document.getElementById(board.target).className = "visitedTargetNodeBlue";
        }
        change(nodes[index])
      } else if (index === nodes.length - 1 && board.currentAlgorithm === "bidirectional") {
        change(nodes[index], nodes[index - 1], "bidirectional");
      } else {
        change(nodes[index], nodes[index - 1]);
      }
      time+=speed;
      timeout(index + 1);
    }, speed);
    document.getElementById("Time").innerHTML = '<a href="#"> Time : '+ time/1000 +' second</a>';
  }

  function change(currentNode, previousNode, bidirectional) {
    let currentHTMLNode = document.getElementById(currentNode.id);
    let relevantClassNames = ["start", "target", "object", "visitedStartNodeBlue", "visitedStartNodePurple", "visitedObjectNode", "visitedTargetNodePurple", "visitedTargetNodeBlue"];
    if (!relevantClassNames.includes(currentHTMLNode.className)) {
      currentHTMLNode.className = !bidirectional ?
        "current" : currentNode.weight === 15 ?
          "visited weight" : "visited";
    }
    if (currentHTMLNode.className === "visitedStartNodePurple" && !object) {
      currentHTMLNode.className = "visitedStartNodeBlue";
    }
    if (currentHTMLNode.className === "target" && object) {
      currentHTMLNode.className = "visitedTargetNodePurple";
    }
    if (previousNode) {
      let previousHTMLNode = document.getElementById(previousNode.id);
      if (!relevantClassNames.includes(previousHTMLNode.className)) {
        if (object) {
          previousHTMLNode.className = previousNode.weight === 15 ? "visitedobject weight" : "visitedobject";
        } else {
          previousHTMLNode.className = previousNode.weight === 15 ? "visited weight" : "visited";
        }
      }
    }
  }

  function shortestPathTimeout(index) {
    setTimeout(function () {
      if (index === shortestNodes.length){
        board.reset();
        if (object) {
          shortestPathChange(board.nodes[board.target], shortestNodes[index - 1]);
          board.objectShortestPathNodesToAnimate = [];
          board.shortestPathNodesToAnimate = [];
          board.clearNodeStatuses();
          let newSuccess;
          if (type === "weighted") {
            newSuccess = weightedSearchAlgorithm(board.nodes, board.object, board.target, board.nodesToAnimate, board.nodeArray, algorithm);
          } else {
            newSuccess = unweightedSearchAlgorithm(board.nodes, board.object, board.target, board.nodesToAnimate, board.nodeArray, algorithm);
          }
          launchAnimations(board, newSuccess, type);
          return;
        } else {
          shortestPathChange(board.nodes[board.target], shortestNodes[index - 1]);
          board.objectShortestPathNodesToAnimate = [];
          board.shortestPathNodesToAnimate = [];
          return;
        }
      } else if (index === 0) {
        shortestPathChange(shortestNodes[index])
      } else {
        shortestPathChange(shortestNodes[index], shortestNodes[index - 1]);
      }
      shortestPathTimeout(index + 1);
    }, 40);
  }

  function shortestPathChange(currentNode, previousNode) {
    let currentHTMLNode = document.getElementById(currentNode.id);
    if (type === "unweighted") {
      currentHTMLNode.className = "shortest-path-unweighted";
    } else {
      if (currentNode.direction === "up") {
        currentHTMLNode.className = "shortest-path-up";
      } else if (currentNode.direction === "down") {
        currentHTMLNode.className = "shortest-path-down";
      } else if (currentNode.direction === "right") {
        currentHTMLNode.className = "shortest-path-right";
      } else if (currentNode.direction === "left") {
        currentHTMLNode.className = "shortest-path-left";
      } else if (currentNode.direction = "down-right") {
        currentHTMLNode.className = "wall"
      }
    }
    if (previousNode) {
      let previousHTMLNode = document.getElementById(previousNode.id);
      previousHTMLNode.className = "shortest-path";
    } else {
      let element = document.getElementById(board.start);
      element.className = "shortest-path";
      element.removeAttribute("style");
    }
  }


  timeout(0);

 

};
function mazeGenerationAnimations(board) {
  let nodes = board.wallsToAnimate.slice(0);
  let speed = 0;
  function timeout(index) {
    setTimeout(function () {
        if (index === nodes.length){
          board.wallsToAnimate = [];
          // board.toggleButtons();
          return;
        }
        nodes[index].className = board.nodes[nodes[index].id].weight === 15 ? "unvisited weight" : "wall";
        timeout(index + 1);
    },5);
  }

  timeout(0);
};

// const astar = require("./astar");



 function bidirectional(nodes, start, target, nodesToAnimate, nodeArray, name, heuristic, board) {
  //   if (name === "astar") return astar(nodes, start, target, nodesToAnimate, nodeArray, name)
  
    if (!start || !target || start === target) {
      return false;
    }
  
    nodes[start].distance = 0;
    nodes[start].direction = "right";
    nodes[target].otherdistance = 0;
    nodes[target].otherdirection = "left";
    let visitedNodes = {};
    let unvisitedNodesOne = Object.keys(nodes);
    let unvisitedNodesTwo = Object.keys(nodes);
    while (unvisitedNodesOne.length && unvisitedNodesTwo.length) {
      let currentNode = closestNode(nodes, unvisitedNodesOne);
      let secondCurrentNode = closestNodeTwo(nodes, unvisitedNodesTwo);
      while ((currentNode.nodeType === "wall" || secondCurrentNode.nodeType === "wall") && unvisitedNodesOne.length && unvisitedNodesTwo.length) {
        if (currentNode.nodeType === "wall") currentNode = closestNode(nodes, unvisitedNodesOne);
        if (secondCurrentNode.nodeType === "wall") secondCurrentNode = closestNodeTwo(nodes, unvisitedNodesTwo);
      }
      if (currentNode.distance === Infinity || secondCurrentNode.otherdistance === Infinity) {
        return false;
      }
      
      nodesToAnimate.push(currentNode);
      nodesToAnimate.push(secondCurrentNode);
      currentNode.nodeType = "visited";
      secondCurrentNode.nodeType = "visited";
      if (visitedNodes[currentNode.id]) {
        board.middleNode = currentNode.id;
        return "success";
      } else if (visitedNodes[secondCurrentNode.id]) {
        board.middleNode = secondCurrentNode.id;
        return "success";
      } else if (currentNode === secondCurrentNode) {
        board.middleNode = secondCurrentNode.id;
        return "success";
      }
      visitedNodes[currentNode.id] = true;
      visitedNodes[secondCurrentNode.id] = true;
      updateNeighbors(nodes, currentNode, nodeArray, target, name, start, heuristic);
      updateNeighborsTwo(nodes, secondCurrentNode, nodeArray, start, name, target, heuristic);
      
    }
  }
  
  
  
  
    function closestNode(nodes, unvisitedNodes) {
    let currentClosest, index;
    for (let i = 0; i < unvisitedNodes.length; i++) {
      if (!currentClosest || currentClosest.distance > nodes[unvisitedNodes[i]].distance) {
        currentClosest = nodes[unvisitedNodes[i]];
        index = i;
      }
    }
    unvisitedNodes.splice(index, 1);
    return currentClosest;
  }
  
    function closestNodeTwo(nodes, unvisitedNodes) {
    let currentClosest, index;
    for (let i = 0; i < unvisitedNodes.length; i++) {
      if (!currentClosest || currentClosest.otherdistance > nodes[unvisitedNodes[i]].otherdistance) {
        currentClosest = nodes[unvisitedNodes[i]];
        index = i;
      }
    }
    unvisitedNodes.splice(index, 1);
    return currentClosest;
  }
  
    function updateNeighbors(nodes, node, nodeArray, target, name, start, heuristic) {
    let neighbors = getNeighbors(node.id, nodes, nodeArray);
    for (let neighbor of neighbors) {
      updateNode(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, nodeArray);
    }
  }
  
    function updateNeighborsTwo(nodes, node, nodeArray, target, name, start, heuristic) {
    let neighbors = getNeighbors(node.id, nodes, nodeArray);
    for (let neighbor of neighbors) {
      updateNodeTwo(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, nodeArray);
    }
  }
  
    function updateNode(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, nodeArray) {
    let distance = getDistance(currentNode, targetNode);
    let weight = targetNode.weight === 15 ? 15 : 1;
    let distanceToCompare = currentNode.distance + (weight + distance[0]) * manhattanDistance(targetNode, actualTargetNode);
    if (distanceToCompare < targetNode.distance) {
      targetNode.distance = distanceToCompare;
      targetNode.previousNode = currentNode.id;
      targetNode.path = distance[1];
      targetNode.direction = distance[2];
    }
  }
  
    function updateNodeTwo(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, nodeArray) {
    let distance = getDistanceTwo(currentNode, targetNode);
    let weight = targetNode.weight === 15 ? 15 : 1;
    let distanceToCompare = currentNode.otherdistance + (weight + distance[0]) * manhattanDistance(targetNode, actualTargetNode);
    if (distanceToCompare < targetNode.otherdistance) {
      targetNode.otherdistance = distanceToCompare;
      targetNode.otherpreviousNode = currentNode.id;
      targetNode.path = distance[1];
      targetNode.otherdirection = distance[2];
    }
  }
  
    function getNeighbors(id, nodes, nodeArray) {
    let coordinates = id.split("-");
    let x = parseInt(coordinates[0]);
    let y = parseInt(coordinates[1]);
    let neighbors = [];
    let potentialNeighbor;
    if (nodeArray[x - 1] && nodeArray[x - 1][y]) {
      potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (nodeArray[x + 1] && nodeArray[x + 1][y]) {
      potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (nodeArray[x][y - 1]) {
      potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (nodeArray[x][y + 1]) {
      potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    return neighbors;
  }
  
    function getDistance(nodeOne, nodeTwo) {
    let currentCoordinates = nodeOne.id.split("-");
    let targetCoordinates = nodeTwo.id.split("-");
    let x1 = parseInt(currentCoordinates[0]);
    let y1 = parseInt(currentCoordinates[1]);
    let x2 = parseInt(targetCoordinates[0]);
    let y2 = parseInt(targetCoordinates[1]);
    if (x2 < x1) {
      if (nodeOne.direction === "up") {
        return [1, ["f"], "up"];
      } else if (nodeOne.direction === "right") {
        return [2, ["l", "f"], "up"];
      } else if (nodeOne.direction === "left") {
        return [2, ["r", "f"], "up"];
      } else if (nodeOne.direction === "down") {
        return [3, ["r", "r", "f"], "up"];
      }
    } else if (x2 > x1) {
      if (nodeOne.direction === "up") {
        return [3, ["r", "r", "f"], "down"];
      } else if (nodeOne.direction === "right") {
        return [2, ["r", "f"], "down"];
      } else if (nodeOne.direction === "left") {
        return [2, ["l", "f"], "down"];
      } else if (nodeOne.direction === "down") {
        return [1, ["f"], "down"];
      }
    }
    if (y2 < y1) {
      if (nodeOne.direction === "up") {
        return [2, ["l", "f"], "left"];
      } else if (nodeOne.direction === "right") {
        return [3, ["l", "l", "f"], "left"];
      } else if (nodeOne.direction === "left") {
        return [1, ["f"], "left"];
      } else if (nodeOne.direction === "down") {
        return [2, ["r", "f"], "left"];
      }
    } else if (y2 > y1) {
      if (nodeOne.direction === "up") {
        return [2, ["r", "f"], "right"];
      } else if (nodeOne.direction === "right") {
        return [1, ["f"], "right"];
      } else if (nodeOne.direction === "left") {
        return [3, ["r", "r", "f"], "right"];
      } else if (nodeOne.direction === "down") {
        return [2, ["l", "f"], "right"];
      }
    }
  }
  
    function getDistanceTwo(nodeOne, nodeTwo) {
    let currentCoordinates = nodeOne.id.split("-");
    let targetCoordinates = nodeTwo.id.split("-");
    let x1 = parseInt(currentCoordinates[0]);
    let y1 = parseInt(currentCoordinates[1]);
    let x2 = parseInt(targetCoordinates[0]);
    let y2 = parseInt(targetCoordinates[1]);
    if (x2 < x1) {
      if (nodeOne.otherdirection === "up") {
        return [1, ["f"], "up"];
      } else if (nodeOne.otherdirection === "right") {
        return [2, ["l", "f"], "up"];
      } else if (nodeOne.otherdirection === "left") {
        return [2, ["r", "f"], "up"];
      } else if (nodeOne.otherdirection === "down") {
        return [3, ["r", "r", "f"], "up"];
      }
    } else if (x2 > x1) {
      if (nodeOne.otherdirection === "up") {
        return [3, ["r", "r", "f"], "down"];
      } else if (nodeOne.otherdirection === "right") {
        return [2, ["r", "f"], "down"];
      } else if (nodeOne.otherdirection === "left") {
        return [2, ["l", "f"], "down"];
      } else if (nodeOne.otherdirection === "down") {
        return [1, ["f"], "down"];
      }
    }
    if (y2 < y1) {
      if (nodeOne.otherdirection === "up") {
        return [2, ["l", "f"], "left"];
      } else if (nodeOne.otherdirection === "right") {
        return [3, ["l", "l", "f"], "left"];
      } else if (nodeOne.otherdirection === "left") {
        return [1, ["f"], "left"];
      } else if (nodeOne.otherdirection === "down") {
        return [2, ["r", "f"], "left"];
      }
    } else if (y2 > y1) {
      if (nodeOne.otherdirection === "up") {
        return [2, ["r", "f"], "right"];
      } else if (nodeOne.otherdirection === "right") {
        return [1, ["f"], "right"];
      } else if (nodeOne.otherdirection === "left") {
        return [3, ["r", "r", "f"], "right"];
      } else if (nodeOne.otherdirection === "down") {
        return [2, ["l", "f"], "right"];
      }
    }
  }
  
    function manhattanDistance(nodeOne, nodeTwo) {
    let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
    let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
    let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
    let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
    return (xChange + yChange);
  }
  
    function weightedManhattanDistance(nodeOne, nodeTwo, nodes) {
    let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
    let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
    let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
    let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
  
    if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
        let additionalxChange = 0,
            additionalyChange = 0;
        for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
          let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
          let currentNode = nodes[currentId];
          additionalxChange += currentNode.weight;
        }
        for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
          let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
          let currentNode = nodes[currentId];
          additionalyChange += currentNode.weight;
        }
  
        let otherAdditionalxChange = 0,
            otherAdditionalyChange = 0;
        for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
          let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
          let currentNode = nodes[currentId];
          additionalyChange += currentNode.weight;
        }
        for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
          let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
          let currentNode = nodes[currentId];
          additionalxChange += currentNode.weight;
        }
  
        if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
          xChange += additionalxChange;
          yChange += additionalyChange;
        } else {
          xChange += otherAdditionalxChange;
          yChange += otherAdditionalyChange;
        }
      }
  
    return xChange + yChange;
  
  
  }


        function unweightedSearchAlgorithm(nodes, start, target, nodesToAnimate, boardArray, name) {
    if (!start || !target || start === target) {
      return false;
    }
    let structure = [nodes[start]];
    let exploredNodes = {start: true};
    while (structure.length) {
      let currentNode = name === "bfs" ? structure.shift() : structure.pop();
      nodesToAnimate.push(currentNode);
      if (name === "dfs") exploredNodes[currentNode.id] = true;
      currentNode.nodeType = "visited";
      if (currentNode.id === target) {
        return "success";
      }
      let currentNeighbors = getNeighbors(currentNode.id, nodes, boardArray, name);
      currentNeighbors.forEach(neighbor => {
        if (!exploredNodes[neighbor]) {
          if (name === "bfs") exploredNodes[neighbor] = true;
          nodes[neighbor].previousNode = currentNode.id;
          structure.push(nodes[neighbor]);
        }
      });
    }
    return false;
  }
  
  function getNeighbors(id, nodes, boardArray, name) {
    let coordinates = id.split("-");
    let x = parseInt(coordinates[0]);
    let y = parseInt(coordinates[1]);
    let neighbors = [];
    let potentialNeighbor;
    if (boardArray[x - 1] && boardArray[x - 1][y]) {
      potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") {
        if (name === "bfs") {
          neighbors.push(potentialNeighbor);
        } else {
          neighbors.unshift(potentialNeighbor);
        }
      }
    }
    if (boardArray[x][y + 1]) {
      potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") {
        if (name === "bfs") {
          neighbors.push(potentialNeighbor);
        } else {
          neighbors.unshift(potentialNeighbor);
        }
      }
    }
    if (boardArray[x + 1] && boardArray[x + 1][y]) {
      potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") {
        if (name === "bfs") {
          neighbors.push(potentialNeighbor);
        } else {
          neighbors.unshift(potentialNeighbor);
        }
      }
    }
    if (boardArray[x][y - 1]) {
      potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") {
        if (name === "bfs") {
          neighbors.push(potentialNeighbor);
        } else {
          neighbors.unshift(potentialNeighbor);
        }
      }
    }
    return neighbors;
  }


      function weightedSearchAlgorithm(nodes, start, target, nodesToAnimate, boardArray, name, heuristic) {
    if (name === "astar") return astar(nodes, start, target, nodesToAnimate, boardArray, name)
    if (!start || !target || start === target) {
      return false;
    }
    nodes[start].distance = 0;
    nodes[start].direction = "right";
    let unvisitedNodes = Object.keys(nodes);
    while (unvisitedNodes.length) {
      let currentNode = closestNode(nodes, unvisitedNodes);
      while (currentNode.nodeType === "wall" && unvisitedNodes.length) {
        currentNode = closestNode(nodes, unvisitedNodes)
      }
      if (currentNode.distance === Infinity) {
        return false;
      }
      nodesToAnimate.push(currentNode);
      currentNode.nodeType = "visited";
      if (currentNode.id === target) return "success!";
      if (name === "CLA" || name === "greedy") {
        updateNeighbors(nodes, currentNode, boardArray, target, name, start, heuristic);
      } else if (name === "dijkstra") {
        updateNeighbors(nodes, currentNode, boardArray);
      }
    }
  }
  
  function closestNode(nodes, unvisitedNodes) {
    let currentClosest, index;
    for (let i = 0; i < unvisitedNodes.length; i++) {
      if (!currentClosest || currentClosest.distance > nodes[unvisitedNodes[i]].distance) {
        currentClosest = nodes[unvisitedNodes[i]];
        index = i;
      }
    }
    unvisitedNodes.splice(index, 1);
    return currentClosest;
  }
  
  function updateNeighbors(nodes, node, boardArray, target, name, start, heuristic) {
    let neighbors = getNeighbors(node.id, nodes, boardArray);
    for (let neighbor of neighbors) {
      if (target) {
        updateNode(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, boardArray);
      } else {
        updateNode(node, nodes[neighbor]);
      }
    }
  }
  
  function averageNumberOfNodesBetween(currentNode) {
    let num = 0;
    while (currentNode.previousNode) {
      num++;
      currentNode = currentNode.previousNode;
    }
    return num;
  }
  
  
  function updateNode(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, boardArray) {
    let distance = getDistance(currentNode, targetNode);
    let distanceToCompare;
    if (actualTargetNode && name === "CLA") {
      let weight = targetNode.weight === 15 ? 15 : 1;
      if (heuristic === "manhattanDistance") {
        distanceToCompare = currentNode.distance + (distance[0] + weight) * manhattanDistance(targetNode, actualTargetNode);
      } else if (heuristic === "poweredManhattanDistance") {
        distanceToCompare = currentNode.distance + targetNode.weight + distance[0] + Math.pow(manhattanDistance(targetNode, actualTargetNode), 2);
      } else if (heuristic === "extraPoweredManhattanDistance") {
        distanceToCompare = currentNode.distance + (distance[0] + weight) * Math.pow(manhattanDistance(targetNode, actualTargetNode), 7);
      }
      let startNodeManhattanDistance = manhattanDistance(actualStartNode, actualTargetNode);
    } else if (actualTargetNode && name === "greedy") {
      distanceToCompare = targetNode.weight + distance[0] + manhattanDistance(targetNode, actualTargetNode);
    } else {
      distanceToCompare = currentNode.distance + targetNode.weight + distance[0];
    }
    if (distanceToCompare < targetNode.distance) {
      targetNode.distance = distanceToCompare;
      targetNode.previousNode = currentNode.id;
      targetNode.path = distance[1];
      targetNode.direction = distance[2];
    }
  }
  
  function getNeighbors(id, nodes, boardArray) {
    let coordinates = id.split("-");
    let x = parseInt(coordinates[0]);
    let y = parseInt(coordinates[1]);
    let neighbors = [];
    let potentialNeighbor;
    if (boardArray[x - 1] && boardArray[x - 1][y]) {
      potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (boardArray[x + 1] && boardArray[x + 1][y]) {
      potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (boardArray[x][y - 1]) {
      potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    if (boardArray[x][y + 1]) {
      potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
      if (nodes[potentialNeighbor].nodeType !== "wall") neighbors.push(potentialNeighbor);
    }
    return neighbors;
  }
  
  
  function getDistance(nodeOne, nodeTwo) {
    let currentCoordinates = nodeOne.id.split("-");
    let targetCoordinates = nodeTwo.id.split("-");
    let x1 = parseInt(currentCoordinates[0]);
    let y1 = parseInt(currentCoordinates[1]);
    let x2 = parseInt(targetCoordinates[0]);
    let y2 = parseInt(targetCoordinates[1]);
    if (x2 < x1) {
      if (nodeOne.direction === "up") {
        return [1, ["f"], "up"];
      } else if (nodeOne.direction === "right") {
        return [2, ["l", "f"], "up"];
      } else if (nodeOne.direction === "left") {
        return [2, ["r", "f"], "up"];
      } else if (nodeOne.direction === "down") {
        return [3, ["r", "r", "f"], "up"];
      }
    } else if (x2 > x1) {
      if (nodeOne.direction === "up") {
        return [3, ["r", "r", "f"], "down"];
      } else if (nodeOne.direction === "right") {
        return [2, ["r", "f"], "down"];
      } else if (nodeOne.direction === "left") {
        return [2, ["l", "f"], "down"];
      } else if (nodeOne.direction === "down") {
        return [1, ["f"], "down"];
      }
    }
    if (y2 < y1) {
      if (nodeOne.direction === "up") {
        return [2, ["l", "f"], "left"];
      } else if (nodeOne.direction === "right") {
        return [3, ["l", "l", "f"], "left"];
      } else if (nodeOne.direction === "left") {
        return [1, ["f"], "left"];
      } else if (nodeOne.direction === "down") {
        return [2, ["r", "f"], "left"];
      }
    } else if (y2 > y1) {
      if (nodeOne.direction === "up") {
        return [2, ["r", "f"], "right"];
      } else if (nodeOne.direction === "right") {
        return [1, ["f"], "right"];
      } else if (nodeOne.direction === "left") {
        return [3, ["r", "r", "f"], "right"];
      } else if (nodeOne.direction === "down") {
        return [2, ["l", "f"], "right"];
      }
    }
  }
  
  function manhattanDistance(nodeOne, nodeTwo) {
    let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
    let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
    let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
    let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
    return (xChange + yChange);
  }
  
  function weightedManhattanDistance(nodeOne, nodeTwo, nodes) {
    let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
    let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
    let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
    let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
  
    if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
      let additionalxChange = 0,
          additionalyChange = 0;
      for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
        let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
  
      let otherAdditionalxChange = 0,
          otherAdditionalyChange = 0;
      for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
        let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
        let currentNode = nodes[currentId];
        additionalyChange += currentNode.weight;
      }
      for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
        let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
        let currentNode = nodes[currentId];
        additionalxChange += currentNode.weight;
      }
  
      if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
        xChange += additionalxChange;
        yChange += additionalyChange;
      } else {
        xChange += otherAdditionalxChange;
        yChange += otherAdditionalyChange;
      }
    } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
        let additionalxChange = 0,
            additionalyChange = 0;
        for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
          let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
          let currentNode = nodes[currentId];
          additionalxChange += currentNode.weight;
        }
        for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
          let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
          let currentNode = nodes[currentId];
          additionalyChange += currentNode.weight;
        }
  
        let otherAdditionalxChange = 0,
            otherAdditionalyChange = 0;
        for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
          let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
          let currentNode = nodes[currentId];
          additionalyChange += currentNode.weight;
        }
        for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
          let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
          let currentNode = nodes[currentId];
          additionalxChange += currentNode.weight;
        }
  
        if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
          xChange += additionalxChange;
          yChange += additionalyChange;
        } else {
          xChange += otherAdditionalxChange;
          yChange += otherAdditionalyChange;
        }
      }
  
    return xChange + yChange;
  
  
  }
  




