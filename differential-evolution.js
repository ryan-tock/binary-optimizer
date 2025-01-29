import _ from 'https://cdn.skypack.dev/lodash';
import { Orbit } from "./orbit.js"

//  Test functions
// https://en.wikipedia.org/wiki/Test_functions_for_optimization

function ensure_bounds(vec, bounds) {
    const vec_new = []
    for (let i of _.range(vec.length)) {

        if (vec[i] < bounds[i][0]) {
            vec_new.push(bounds[i][0])
        } else if (vec[i] > bounds[i][1]) {
            vec_new.push(bounds[i][1])
        } else {
            vec_new.push(vec[i])
        }
    }
 
    return vec_new
}

function create_population(bounds) {
    const population = []
    for (let i in _.range(popsize)) {
        let indv = []
        for (let j in _.range(bounds.length)) {
            indv.push(bounds[j][0] + Math.random()*(bounds[j][1] - bounds[j][0]))
        }
        population.push(indv)
    }

    return population;
}

function differential_step(population, cost_func, bounds, popsize, mutate, recombination) {

    var gen_scores = [] // score keeping

    // cycle through each individual in the population
    for (let j in _.range(popsize)) {
        //--- MUTATION (step #3.A) ---------------------+
        
        // select three random vector index positions [0, popsize), not including current vector (j)
        let canidates = _.range(popsize)
        canidates.splice(j, 1)
        let random_index = _.sampleSize(canidates, 3)

        let x_1 = population[random_index[0]]
        let x_2 = population[random_index[1]]
        let x_3 = population[random_index[2]]
        let x_t = population[j]     // target individual

        // subtract x3 from x2, and create a new vector (x_diff)
        let x_diff = _.zip(x_3, x_2).map(e => e[0] - e[1])

        // multiply x_diff by the mutation factor (F) and add to x_1
        let v_donor = _.zip(x_1, x_diff).map(e => e[0] + mutate * e[1])
        v_donor = ensure_bounds(v_donor, bounds)

        //--- RECOMBINATION (step #3.B) ----------------+

        let v_trial = []
        for (let k in _.range(x_t.length)) {
            let crossover = Math.random()
            if (crossover <= recombination) {
                v_trial.push(v_donor[k])
                
            } else {
                v_trial.push(x_t[k])
            }
        }
                
        //--- GREEDY SELECTION (step #3.C) -------------+

        let score_trial  = cost_func(v_trial)
        let score_target = cost_func(x_t)


        if (score_trial < score_target) {
            population[j] = v_trial
            gen_scores.push(score_trial)
        } else {
            gen_scores.push(score_target)
        }
    }

    return [population, gen_scores];

    
}


//--- CONSTANTS ----------------------------------------------------------------+

const popsize = 20
const mutate = 0.5                        // Mutation factor [0,2]
const recombination = 0.7                 // Recombination rate [0,1]
var data = [];

export function orbit_from_vector(x) {
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

onmessage = (e) => {
    var bounds = e.data[0];
    var maxiter = e.data[1];
    data = e.data[2];

    var population = create_population(bounds);
    for (const i in population) {
        population[i][5] /= 10.0;
    }

    var scores = [];
    var bestScore = 1000000000;
    var bestPop = [];

    for (const i in _.range(maxiter)) {
        var step_result = differential_step(population, test_orbit, bounds, popsize, mutate, recombination);
        population = step_result[0];
        scores = step_result[1];
        let gen_best = _.min(scores);
        let gen_sol = population[scores.indexOf(gen_best)];

        if (gen_best < bestScore) {
            bestScore = gen_best;
            bestPop = gen_sol;
            postMessage(["best", [bestPop, bestScore]]);
        }
    }

    postMessage(["done", []]);
}