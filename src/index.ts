import './index.css';
import REGL from 'regl'
import { Resizer } from './resizer'

const initialGraphX = 0;
const initialGraphY = 0;
const initialZoom = .4;

const MAX_ITERATIONS = 100;

// used for scaling iterations into colors
const COLOR_CYCLES = 2;

document.addEventListener('DOMContentLoaded', function () {
    const regl = REGL({
        //extensions: ['OES_texture_float'],
        // optionalExtensions: ['oes_texture_float_linear'],
    });

    const urlParams = new URLSearchParams(window.location.search);
    let graphX = initialGraphX;
    let graphY = initialGraphY;
    let graphZoom = initialZoom;

    const resizer = new Resizer(window, 2 / graphZoom);

    const draw = regl({
        frag: `
    precision highp float;
    uniform float graphWidth;
    uniform float graphHeight;
    uniform float graphX;
    uniform float graphY;
    varying vec2 uv;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    int julia(vec2 c, vec2 orbit) {
        for(int i=0; i <= ${MAX_ITERATIONS}; i++) {
            orbit = vec2(
                orbit.x*orbit.x - orbit.y*orbit.y + c.x,
                2.*orbit.x*orbit.y + c.y
            );
            if (abs(orbit.x) > 2. || abs(orbit.y) > 2.) return i;
        }

        return -1; // indicate unfinished
    }



    void main() {
        // These transformations can hypothetically happen in the vertex, but that means when you're running up against the
        // lower bounds of floats you'll get the edges wobbling back and forth as you zoom because the rounding errors are
        // happening during the plane interpolation step. Keeping the vertex ranging from -0.5 to 0.5 dodges that issue.
        vec2 start = vec2(graphX, graphY) + uv * vec2(graphWidth, graphHeight);
        int iterations = julia(vec2(0.75,0.25), start);

        // if still alive...
        if (iterations < 0) {
            gl_FragColor = vec4(0., 1., 0., 1.);
            return;
        }

        float scaled=log(float(iterations))/log(${MAX_ITERATIONS}.);
        gl_FragColor = vec4(
            hsv2rgb(
                vec3(
                    mod(scaled, 1./${COLOR_CYCLES}.) * ${COLOR_CYCLES}.,
                    .2+scaled*1.5, // tops out at 1
                    scaled*1.5
                )
            ), 1.0
        );
    }`,

        vert: `
    precision highp float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
        uv = position / 2.;
        gl_Position = vec4(position, 0, 1);
    }`,

        attributes: {
            position: regl.buffer([
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1]
            ])
        },

        uniforms: {
            graphWidth: (context, props) => (props as any).graphWidth,
            graphHeight: (context, props) => (props as any).graphHeight,
            graphX: (context, props) => (props as any).graphX,
            graphY: (context, props) => (props as any).graphY,
        },

        depth: { enable: false },

        count: 4,

        primitive: 'triangle strip'
    })

    //let seenFocus = false;
    let lastTime = performance.now();
    regl.frame(() => {
        const thisTime = performance.now();

        // dTime always assumes between 1 and 144 fps
        const dTime = Math.min(1000, Math.max(1000 / 144, thisTime - lastTime));

        lastTime = thisTime;

        // It burns a lot of juice running this thing so cool it while it's not in the very foreground
        // if (document.hasFocus() && document.visibilityState == "visible") {
        //     seenFocus = true;
        // } else if (seenFocus) {
        //     // only skip rendering if focus has been confirmed at least once
        //     return;
        // }

        draw({
            graphWidth: resizer.graphWidth,
            graphHeight: resizer.graphHeight,
            graphX: graphX,
            graphY: graphY
        })
    })
}, false);
