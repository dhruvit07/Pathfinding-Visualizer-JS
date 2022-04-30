import Board from "./Modules/Board.js";

import Node from "./Modules/Node.js";
import weightedSearchAlgorithm from "./modules/Algorithms/Dijkstra.js";
import recursiveDivisionMaze from "./Modules/Maze/recursiveMaze.js";
import mazeGenerationAnimations from "./Modules/animation/mazeGenerationAnimation.js";
import bidirectional from "./Modules/Algorithms/bidirectional.js";
import launchAnimations from "./Modules/animation/launchAnimation.js";
import unweightedSearchAlgorithm from "./Modules/Algorithms/unweightedSearchAlgorithm.js";


let height = Math.floor(document.documentElement.clientHeight / 50);
let width = Math.floor(document.documentElement.clientWidth / 40);
let board = new Board(height, width);
board.initialize();

let weightButton = document.getElementById("weight_button");

weightButton.addEventListener("click",function(){

    let newNodeId = `${0}-${0}`;
        board.object = `${newNodeId}`;
        board.numberOfObjects = 1;
        let noe = document.getElementById(newNodeId);
        noe.className = "object";
        board.nodeArray[0][0].nodeType = "object";

    if(board.drawWall === false){
        board.drawWall=true;
    }
    else{
        board.drawWall = false;
    }
    console.log(board.drawWall);
});

let visualizeButton = document.getElementById("algorithmDescriptor");
visualizeButton.addEventListener("click",function(){

    let unweightedAlgorithms = ["dfs", "bfs"]
    let success;
    if (unweightedAlgorithms.includes(board.currentAlgorithm)) {
        if (!board.numberOfObjects) {
         success = unweightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm);
          launchAnimations(board, success, "unweighted");
        } else {
          board.isObject = true;
         success = unweightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, board.currentAlgorithm);
          launchAnimations(board, success, "unweighted", "object", board.currentAlgorithm);
        }
    }

    if (board.currentAlgorithm === "bidirectional") {
          success = bidirectional(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic, board);
          launchAnimations(board, success, "weighted");
    }

    if (board.currentAlgorithm === "dijkstra") {
        if (!board.numberOfObjects) {
            console.log("hello");
          success = weightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic,board);
          launchAnimations(board, success, "weighted");
        }
        else {
            board.isObject = true;
           success = weightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic);
            launchAnimations(board, success, "weighted", "object", board.currentAlgorithm, board.currentHeuristic);
          }
        }
});


