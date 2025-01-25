import { Orbit } from "./orbit.js"
import { optimize_func } from "./differential-evolution.js";
import { find_expression, scale_viewport, set_orbit, read_data } from "./desmos_utils.js"

async function fetchJSON(filename) {
    const response = await fetch('./' + filename);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

var elt = document.getElementById('calculator');
var calculator = Desmos.Calculator3D(elt);

var state = await fetchJSON("state.json");
var data = await fetchJSON("data.json");

function orbit_from_vector(x) {
    var e = x[0];
    var i = x[1];
    var node = x[2];
    var periapsis = x[3];
    var m_0 = x[4];
    var p = x[5];

    var orbit = new Orbit(e, i, node, periapsis, m_0, p);
    orbit.optimize_sm(data);
    return orbit;
}
function test_orbit(x) {
    var orbit = orbit_from_vector(x);
    return orbit.calculate_error(data);
}
var to_render = [];
var fitting = false;
export function render_orbit(x) {
    to_render.push(x);
}


function refit() {
    state = calculator.getState();
    var refit_line = find_expression(state, "r_{efit}=");
    if (state['expressions']['list'][refit_line]['latex'] != "r_{efit}=1") {
        return;
    }
    state['expressions']['list'][refit_line]['latex'] = "r_{efit}=0";

    if (fitting) {
        return;
    }
    data = read_data(state);
    startup();
}

function startup() {
    state['graph']['speed3D'] = 0;
    to_render = [];
    fitting = true;
    optimize_func(test_orbit, [[0, 0.95], [0, Math.PI], [0, 2 * Math.PI], [0, 2 * Math.PI], [0, 2 * Math.PI], [1, 1000]]);

    var interval = setInterval(function() {
        if (to_render.length == 0) {
            clearInterval(interval);
            fitting = false;
        } else {
            var render = to_render[to_render.length - 1];
            to_render = [];
            var orbit = orbit_from_vector(render);
            scale_viewport(state, orbit, data);
            set_orbit(state, orbit, data);
            calculator.setState(state);
        }
    }, 1000)
}

calculator.setState(state);
startup();
calculator.observeEvent('change', refit)