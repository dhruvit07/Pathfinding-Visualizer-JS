import Board from "./Modules/Board.js";
import visualizeDijkstra from "./Modules/Algorithms/Dijkstra.js";

let height = Math.floor(document.documentElement.clientHeight / 30);
let width = Math.floor(document.documentElement.clientWidth / 25);
let board = new Board(height, width);
board.initialize();

let visualizeButton = document.getElementById("algorithmDescriptor");
let weightButton = document.getElementById("weight");

weightButton.addEventListener("click",function(){

    if(board.drawWall === false){
        board.drawWall=true;
    }
    else{
        board.drawWall = false;
    }
    console.log(board.drawWall);
});
visualizeButton.addEventListener("click", visualizeDijkstra);

