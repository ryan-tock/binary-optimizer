import { Orbit } from "./orbit.js"
import { find_expression, scale_viewport, set_orbit, read_data, set_secret } from "./desmos_utils.js"

async function fetchJSON(filename) {
    const response = await fetch('./' + filename);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
var state = await fetchJSON("state.json");

const fileInput = document.getElementById("file-input");
const keyDropdown = document.getElementById("key-dropdown");

var jsonData = {};

fileInput.addEventListener('change', event => {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                jsonData = JSON.parse(e.target.result);
                populateDropdown(jsonData);
            } catch {
                alert("invalid json file");
            }
        }

        reader.onerror = () => {
            alert("error reading file");
        }

        reader.readAsText(file);
    }
});

function populateDropdown(data) {
    keyDropdown.innerHTML = '<option value="">Select an Orbit</option>';
    Object.keys(data).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        keyDropdown.appendChild(option);
    });

    keyDropdown.disabled = false;
}

var key = "";

keyDropdown.addEventListener('change', (event) => {
    
    if (key && key != "Select an Orbit") {
        jsonData[key]['data'] = data;
    }

    key = event.target.value;

    delete_calculator();
    if (key && jsonData[key]) {
        graph_data();
    }
});


var data = [];
var elements = [];
var calculators = [];
var calculator = 0;
var workers = [];
var threads = 7;
var orbit_bounds = [[0, 0.95], [0, Math.PI], [0, 2 * Math.PI], [0, 2 * Math.PI], [0, 2 * Math.PI], [1, 1000]];

var last_switched = 0;
var recent_fit;
var finished_threads = 0;

function setup_calculator() {
    for (const i in [0,1]) {
        const newDiv = document.createElement('div');
        const id = +i + 1
        newDiv.id = 'calculator' + id;
        newDiv.style.width = "1200px";
        newDiv.style.height = "800px";

        document.body.appendChild(newDiv);
    }

    var elt1 = document.getElementById('calculator1');
    var elt2 = document.getElementById('calculator2');

    elements = [elt1, elt2];

    var calculator1 = Desmos.Calculator3D(elt1);
    var calculator2 = Desmos.Calculator3D(elt2);

    calculators = [calculator1, calculator2];

    state['graph']['speed3D'] = 0;
    set_secret(state, true);

    elt2.style.display = "none";
    elt1.style.display = "";
    
    calculator1.setState(state);
    calculator2.setState(state);

    calculator1.observeEvent('change', check_refit);
    calculator2.observeEvent('change', check_refit);

    return calculators, elements;
}

function delete_calculator() {
    if (calculators[0]) {
        calculators[0].destroy();
    }
    if (calculators[1]) {
        calculators[1].destroy();
    }

    if (elements[0]) {
        elements[0].remove();
    }
    if (elements[1]) {
        elements[1].remove();
    }
}

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

function fit_with_workers() {
    for (const worker_index in workers) {
        var worker = workers[worker_index];
        worker.onmessage = (e) => {
            parse_worker_message(e);
        }
        worker.onerror = (error) => {
            console.log("worker error");
            console.log(error)
        }

        worker.postMessage([orbit_bounds, 5000, data]);
    }
}

function parse_worker_message(e) {
    var status = e.data[0];
    var orbit_data = e.data[1];

    if (status == "best") {
        var orbit = orbit_from_vector(orbit_data[0]);
        var orbit_score = orbit_data[1];
        if (orbit_score < recent_fit[1]) {
            recent_fit = [orbit, orbit_score];
        } else {
            return;
        }
        let now = Date.now();
        if (now - last_switched > 1000) {
            last_switched = now
            scale_viewport(state, recent_fit[0], data);
            set_orbit(state, recent_fit[0], data);
            calculators[calculator].setState(state);
            elements[calculator].style.display = "none";

            calculator = (calculator + 1) % 2

            elements[calculator].style.display = "";

        }
    }

    if (status == "done") {
        finished_threads++;
        if (finished_threads < threads) {
            return;
        }
        calculator = (calculator + 1) % 2;

        set_secret(state, false);
        scale_viewport(state, recent_fit[0], data);
        set_orbit(state, recent_fit[0], data);
        calculators[calculator].setState(state);
        setTimeout(function() {
            elements[calculator].style.display = "";
            calculator = (calculator + 1) % 2;
            elements[calculator].remove();
            calculators[calculator].destroy();
            calculator = (calculator + 1) % 2;

            keyDropdown.disabled = false;
        }, 500);
    }
}

function check_refit() {
    state = calculators[calculator].getState();
    var refit_line = find_expression(state, "r_{efit}=");
    if (state['expressions']['list'][refit_line]['latex'] != "r_{efit}=1") {
        return false;
    }
    data = read_data(state);
    state['expressions']['list'][refit_line]['latex'] = "r_{efit}=0";

    delete_calculator();
    calculators, elements = setup_calculator();
    calculator = 0;

    recent_fit = [orbit_from_vector([0, 0, 0, 0, 0, 1]), 1000000000];
    last_switched = Date.now();
    finished_threads = 0;

    fit_with_workers();
}

async function graph_data() {
    keyDropdown.disabled = true;

    data = jsonData[key]['data'];
    state = await fetchJSON("state.json");

    calculators, elements = setup_calculator();
    calculator = 0;

    workers = [];
    for (let i=0; i<threads; i++) {
        workers.push(new Worker("./differential-evolution.js", { type: 'module' }));
    }

    last_switched = Date.now();
    recent_fit = [orbit_from_vector([0, 0, 0, 0, 0, 1]), 1000000000];

    finished_threads = 0;
    fit_with_workers();
}