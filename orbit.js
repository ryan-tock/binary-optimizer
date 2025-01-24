const NEWTON_ITERATIONS = 6
export class Orbit {
    constructor(e, i, node, periapsis, m_0, p) {
        this.e = e;
        this.i = i;
        this.node = node;
        this.periapsis = periapsis;
        this.m_0 = m_0;
        this.p = p;

        this.beta = e / (1 + Math.sqrt(1 - e * e));
        this.predicted_positions = [];
    }

    *calculate_mean_anomaly(t) {
        return this.m_0 + (2 * Math.PI / this.p) * (t - 2000);
    }

    *calculate_eccentric_anomaly(t) {
        const mean_anomaly = this.calculate_mean_anomaly(t);
        var guess = mean_anomaly;

        for (let i=0; i<NEWTON_ITERATIONS; i++) {
            guess = guess + (mean_anomaly - guess + this.e * Math.sin(guess)) / (1 - this.e * Math.cos(guess));
        }

        return guess;
    }

    *calculate_true_anomaly(eccentric_anomaly) {
        return eccentric_anomaly + 2 * Math.atan(this.beta * Math.sin(eccentric_anomaly) / (1 - this.beta * Math.cos(eccentric_anomaly)));
    }

    *calculate_pos_scaled(t) {
        var eccentric_anomaly = this.calculate_eccentric_anomaly(t);
        var true_anomaly = this.calculate_true_anomaly(eccentric_anomaly);

        var radius_scaled = 1 - this.e * Math.cos(eccentric_anomaly);

        var planar_angles = [Math.cos(true_anomaly + this.periapsis), Math.sin(true_anomaly + this.periapsis)];
        var node_angles = [Math.cos(this.node - 3 * Math.PI / 2), Math.sin(this.node - 3 * Math.PI / 2)];
        var inclined_angle = Math.cos(this.i);

        var x = radius_scaled * (planar_angles[0] * node_angles[0] - inclined_angle * planar_angles[1] * node_angles[1]);
        var y = radius_scaled * (inclined_angle * planar_angles[1] * node_angles[0] + planar_angles[0] * node_angles[1]);
        var z = radius_scaled * planar_angles[1] * Math.sin(this.i);

        return [x, y, z]
    }

    optimize_sm(data) {
        var parameter_squared = 0;
        var resultant = 0;

        for (const i in data) {
            t = data[i]['t'];
            x_actual = data[i]['x'];
            y_actual = data[i]['y'];
            weight = data[i]['weight'];

            var pos_predict = this.calculate_pos_scaled(t);
            this.predicted_positions.push(pos_predict)

            parameter_squared += pos_predict[0] ** 2 * weight;
            parameter_squared += pos_predict[1] ** 2 * weight;

            resultant += pos_predict[0] * x_actual * weight;
            resultant += pos_predict[1] * y_actual * weight;
        }

        this.sm = resultant / parameter_squared;

        if (this.sm < 0) {
            this.sm = 0;
        }
    }

    calculate_pos(t) {
        var pos = this.calculate_pos_scaled(t);
        return [this.sm * pos[0], this.sm * pos[1], this.sm * pos[2]];
    }

    calculate_error(data) {
        var error = 0;
        for (const i in data) {
            error += (data[i]['x'] - this.sm * this.predicted_positions[i][0]) ** 2 * data[i]['weight'];
            error += (data[i]['y'] - this.sm * this.predicted_positions[i][1]) ** 2 * data[i]['weight'];
        }

        return error;
    }

    calculate_r_squared(data) {
        return 0;
    }

}
