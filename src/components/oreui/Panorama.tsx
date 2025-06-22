'use client';

import { useEffect, useRef } from "react";
import panoramaImage from "@/../public/panorama.png";

// language=GLSL
const vertexShaderSource = `#version 300 es
    precision highp float;

    in vec2 a_position;
    out vec2 v_uv;

    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// language=GLSL
const fragmentShaderSource = `#version 300 es
    precision highp float;

    uniform vec2 u_resolution;
    uniform sampler2D u_panorama;
    uniform vec2 u_panoramaSize;
    uniform float u_yaw;
    uniform float u_pitch;
    uniform float u_fov;
    
    in vec2 v_uv;
    out vec4 fragColor;
    
    const float PI = 3.141592653589793;
    
    void main() {
        vec2 uv = (v_uv * u_resolution - 0.5 * u_resolution) / u_resolution.y;
        
        float fovScale = tan(u_fov * 0.5);
        vec3 rd = normalize(vec3(uv.x * fovScale, uv.y * fovScale, 1.0));
        
        float cosPitch = cos(u_pitch);
        float sinPitch = sin(u_pitch);
        vec3 rd1 = vec3(rd.x,
                        rd.y * cosPitch - rd.z * sinPitch,
                        rd.y * sinPitch + rd.z * cosPitch);
        
        float cosYaw = cos(u_yaw);
        float sinYaw = sin(u_yaw);
        vec3 rdRot = vec3(rd1.x * cosYaw + rd1.z * sinYaw,
                          rd1.y,
                          -rd1.x * sinYaw + rd1.z * cosYaw);
        
        float theta = atan(rdRot.z, rdRot.x);
        float phi   = asin(clamp(rdRot.y, -1.0, 1.0));
        
        float u = (theta + PI) / (2.0 * PI);
        float v = (phi + 0.5 * PI) / PI;
        
        vec2 panoramaCoord = vec2(u * u_panoramaSize.x, v * u_panoramaSize.y);
        fragColor = texture(u_panorama, panoramaCoord / u_panoramaSize);
    }
`;

export default function Panorama({ rotating = false }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2', { antialias: false })!;
        if (!gl) return console.error('WebGL2 not supported');

        function compileShader(type: GLenum, source: string) {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                console.error(gl.getShaderInfoLog(shader));
            return shader;
        }
        const program = gl.createProgram()!;
        gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
        gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            console.error(gl.getProgramInfoLog(program));
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());  // quad full screen
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ -1, -1, 1, -1, -1, 1, 1, 1 ]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'u_resolution');
        const uPanoramaSize = gl.getUniformLocation(program, 'u_panoramaSize');
        const uYaw = gl.getUniformLocation(program, 'u_yaw');
        const uPitch = gl.getUniformLocation(program, 'u_pitch');
        const uFov = gl.getUniformLocation(program, 'u_fov');

        let animationFrameId: number;
        let yaw = 0;
        let last = performance.now();
        const rotationSpeed = 0.02;
        function render() {
            const now = performance.now();
            const dt = (now - last) / 1000;
            last = now;
            if (rotating) yaw -= dt * rotationSpeed;
            gl.uniform1f(uYaw, yaw);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            animationFrameId = requestAnimationFrame(render);
        }

        const dpr = window.devicePixelRatio || 1;
        function resize() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
        }
        window.addEventListener('resize', resize);
        resize();

        const image = new Image();
        image.src = panoramaImage.src;
        image.onload = () => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            gl.uniform2f(uPanoramaSize, image.width, image.height);
            gl.uniform1f(uPitch, 0);
            gl.uniform1f(uFov, Math.PI / /* 2 */ 1.5);
            render();
            canvas.style.opacity = '1';
        };

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [ rotating ]);

    return (<canvas
        ref={canvasRef}
        style={{
            position: 'fixed',
            width: '100%',
            height: '100%',
            transition: 'opacity 1s',
            opacity: 0,
            zIndex: -1,
        }}
    />);
}
