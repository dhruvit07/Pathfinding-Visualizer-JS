import Board from "./Modules/Board.js";
import visualizeDijkstra from "./Modules/Algorithms/Dijkstra.js";


let button = document.getElementById("algorithmDescriptor");
button.addEventListener("click", visualizeDijkstra);