import Board from "./Modules/Board.js";

import Node from "./Modules/Node.js";
import weightedSearchAlgorithm from "./modules/Algorithms/Dijkstra.js";
import recursiveDivisionMaze from "./Modules/Maze/recursiveMaze.js";
import mazeGenerationAnimations from "./Modules/animation/mazeGenerationAnimation.js";
import bidirectional from "./Modules/Algorithms/bidirectional.js";
import launchAnimations from "./Modules/animation/launchAnimation.js";

let height = Math.floor(document.documentElement.clientHeight / 30);
let width = Math.floor(document.documentElement.clientWidth / 25);
let board = new Board(height, width);
board.initialize();

let weightButton = document.getElementById("weight_button");

weightButton.addEventListener("click",function(){

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

    // if (board.currentAlgorithm === "bidirectional") {
    //       let success = bidirectional(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic, board);
    //       launchAnimations(board, success, "weighted");
    // }

    if (board.currentAlgorithm === "dijkstra") {
        if (!board.numberOfObjects) {
            console.log("hello");
          let success = weightedSearchAlgorithm(board.nodes, board.start, board.target, board.nodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic,board);
          launchAnimations(board, success, "weighted");
        }
        else {
            board.isObject = true;
           let success = weightedSearchAlgorithm(board.nodes, board.start, board.object, board.objectNodesToAnimate, board.nodeArray, board.currentAlgorithm, board.currentHeuristic);
            launchAnimations(board, success, "weighted", "object", board.currentAlgorithm, board.currentHeuristic);
          }
        }
});


