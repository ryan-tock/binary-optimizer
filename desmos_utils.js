export function find_expression(state, prefix) {
    let expressions = state['expressions']['list']
    for (const i in expressions) {
        if (Object.hasOwn(expressions[i], 'latex')) {
            if (expressions[i]['latex'].startsWith(prefix)) {
                return i;
            }
        }
    }
}

export function scale_viewport(state, orbit, data) {
    var num = 0;
    for (const i in data) {
        let x = Math.abs(data[i]['x']);
        let y = Math.abs(data[i]['y']);
        let z = Math.abs(orbit.calculate_pos(data[i]['t'])[2]);
        if (x > num) {
            num = x;
        }
        if (y > num) {
            num = y;
        }
        if (z > num) {
            num = z;
        }
    }

    num = num * 1.2;

    state['graph']['viewport']['xmin'] = -num;
    state['graph']['viewport']['ymin'] = -num;
    state['graph']['viewport']['zmin'] = -num;

    state['graph']['viewport']['xmax'] = num;
    state['graph']['viewport']['ymax'] = num;
    state['graph']['viewport']['zmax'] = num;
}

export function set_secret(state, secret) {
    let expressions = state['expressions']['list'];
    for (const i in expressions) {
        if (expressions[i].type == 'folder' && expressions[i].title != 'Orbital Parameters') {
            expressions[i].secret = secret;
        }
        if (expressions[i].type == 'text') {
            expressions[i].secret = secret;
        }
    }
}

export function read_data(state) {
    var data = [];

    let t_index = find_expression(state, 't_{0}=');
    let x_index = find_expression(state, 'x_{0}=');
    let y_index = find_expression(state, 'y_{0}=');
    let weights_index = find_expression(state, 'w_{eights}=');
    let methods_index = find_expression(state, 'm_{ethod}=');

    let t = JSON.parse(state['expressions']['list'][t_index]['latex'].split("\\left")[1].split("\\right")[0] + "]");
    let x = JSON.parse(state['expressions']['list'][x_index]['latex'].split("\\left")[1].split("\\right")[0] + "]");
    let y = JSON.parse(state['expressions']['list'][y_index]['latex'].split("\\left")[1].split("\\right")[0] + "]");
    let weights = JSON.parse(state['expressions']['list'][weights_index]['latex'].split("\\left")[1].split("\\right")[0] + "]");
    let methods = JSON.parse(state['expressions']['list'][methods_index]['latex'].split("\\left")[1].split("\\right")[0] + "]");

    for (const i in t) {
        data.push({
            't': t[i],
            'x': x[i],
            'y': y[i],
            'weight': weights[i],
            'method': methods[i]
        })
    }

    return data;
}

export function set_orbit(state, orbit, data) {
    let a = find_expression(state, 'a_{input}=');
    state['expressions']['list'][a]['latex'] = 'a_{input}=' + orbit.sm;

    let e = find_expression(state, 'e_{0}=');
    state['expressions']['list'][e]['latex'] = 'e_{0}=' + orbit.e;

    let i = find_expression(state, 'i=');
    state['expressions']['list'][i]['latex'] = 'i=' + orbit.i * 180 / Math.PI;

    let O = find_expression(state, '\\Omega=');
    state['expressions']['list'][O]['latex'] = '\\Omega=' + orbit.node * 180 / Math.PI;

    let o = find_expression(state, '\\omega=');
    state['expressions']['list'][o]['latex'] = '\\omega=' + orbit.periapsis * 180 / Math.PI;

    let M = find_expression(state, 'M_{0}=');
    state['expressions']['list'][M]['latex'] = 'M_{0}=' + orbit.m_0 * 180 / Math.PI;

    let p = find_expression(state, 'p=');
    state['expressions']['list'][p]['latex'] = 'p=' + orbit.p;

    let t_index = find_expression(state, 't_{0}=');
    let x_index = find_expression(state, 'x_{0}=');
    let y_index = find_expression(state, 'y_{0}=');
    let weights_index = find_expression(state, 'w_{eights}=');
    let methods_index = find_expression(state, 'm_{ethod}=');

    var t = [];
    var x = [];
    var y = [];
    var weights = [];
    var methods = [];
    for (const i in data) {
        t.push(data[i]['t']);
        x.push(data[i]['x']);
        y.push(data[i]['y']);
        weights.push(data[i]['weight']);
        methods.push(data[i]['method']);
    }

    state['expressions']['list'][t_index]['latex'] = 't_{0}=\\left[' + t + '\\right]'
    state['expressions']['list'][x_index]['latex'] = 'x_{0}=\\left[' + x + '\\right]'
    state['expressions']['list'][y_index]['latex'] = 'y_{0}=\\left[' + y + '\\right]'
    state['expressions']['list'][weights_index]['latex'] = 'w_{eights}=\\left[' + weights + '\\right]'
    state['expressions']['list'][methods_index]['latex'] = 'm_{ethod}=\\left[' + methods + '\\right]'
}