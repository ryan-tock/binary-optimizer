import {Orbit} from "./orbit.js"

async function fetchJSON() {
    const response = await fetch('./state.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

var elt = document.getElementById('calculator');
var calculator = Desmos.Calculator3D(elt);

var state = await fetchJSON();

calculator.setState(state)