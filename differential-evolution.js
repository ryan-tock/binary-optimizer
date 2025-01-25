import _ from 'https://cdn.skypack.dev/lodash';
import { render_orbit } from "./main.js"

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
        indv[5] = bounds[5][0] + Math.random() / 10.0 * (bounds[5][1] - bounds[5][0])
        population.push(indv)
    }

    return population;
}

function recursive_differential(population, cost_func, bounds, popsize, mutate, recombination, maxiter, iter, best) {
    if (iter >= maxiter) {
        return;
    }

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

    let gen_best = _.min(gen_scores);
    let gen_sol = population[gen_scores.indexOf(gen_best)];
    if (gen_best < best) {
        best = gen_best;
        render_orbit(gen_sol);
        setTimeout(function() {recursive_differential(population, cost_func, bounds, popsize, mutate, recombination, maxiter, iter + 1, best);}, 40);
    } else {
        recursive_differential(population, cost_func, bounds, popsize, mutate, recombination, maxiter, iter + 1, best);
    }
}


//--- CONSTANTS ----------------------------------------------------------------+

const popsize = 60                        // Population size, must be >= 4
const mutate = 0.5                        // Mutation factor [0,2]
const recombination = 0.7                 // Recombination rate [0,1]
const maxiter = 2000                        // Max number of generations (maxiter)

export function optimize_func(func, bounds) {
    var starting_pop = create_population(bounds);

    for (const i in starting_pop) {
        starting_pop[i][5] /= 5;
    }

    recursive_differential(starting_pop, func, bounds, popsize, mutate, recombination, maxiter, 0, 1000000000);
}