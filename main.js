import * as THREE from 'three';

// --- Basic Setup ---------------------------------------------------------------
const scene = new THREE.Scene();
const canvas = document.getElementById('webgl-canvas');

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.01, 100); 

camera.position.set(0.0, 1.5, 10.0); 
camera.lookAt(0, 0, 0);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Handle window resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    camera.fov = 50;
    blackHoleMaterial.uniforms.uFov.value = camera.fov;

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    blackHoleMaterial.uniforms.uResolution.value.set(sizes.width, sizes.height);
});

// --- Clock for Animation -------------------------------------------------------
const clock = new THREE.Clock();

// --- Black Hole Shader Uniforms ------------------------------------------------
const blackHoleUniforms = {
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
    uCameraPosition: { value: camera.position.clone() },
    uLookAt: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    uFov: { value: camera.fov },
    uSchwarzschildRadius: { value: 1.2 }, 
    uDiskInnerRadius: { value: 1.8 },
    uDiskOuterRadius: { value: 6.0 },
    uMaxIterations: { value: 400 },
    uStepSize: { value: 0.04 },
    uDiskBrightness: { value: 7.0 },
    uDiskDensity: { value: 15.0 },
    uOrbitalSpeedFactor: { value: 0.5 },
    uDiskRotationSpeed: { value: 0.1 }
};

// --- Vertex Shader (Full-Screen Quad) ------------------------------------------
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

// --- Fragment Shader (Relativistic Black Hole) ---------------------------------
const fragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uCameraPosition;
    uniform vec3 uLookAt;
    uniform float uFov;
    uniform float uSchwarzschildRadius;
    uniform float uDiskInnerRadius;
    uniform float uDiskOuterRadius;
    uniform int uMaxIterations;
    uniform float uStepSize;
    uniform float uDiskBrightness;
    uniform float uDiskDensity;
    uniform float uOrbitalSpeedFactor;
    uniform float uDiskRotationSpeed;

    varying vec2 vUv;

    #define PI 3.14159265359
    #define FAR_PLANE 100.0 

    // --- Utility Functions ---
    float hash(float n) { return fract(sin(n) * 43758.5453); }

    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        float n = p.x + p.y * 157.0 + p.z * 113.0;
        return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                       mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
                   mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                       mix(hash(n + 113.0 + 157.0), hash(n + 114.0 + 157.0), f.x), f.y), f.z);
    }

    // VVV CHANGE: Added more octaves for finer, more gaseous noise
    float fbm(vec3 p) {
        float f;
        f = 0.5000 * noise(p); p = p * 2.02;
        f += 0.2500 * noise(p); p = p * 2.03;
        f += 0.1250 * noise(p); p = p * 2.01;
        f += 0.0625 * noise(p); p = p * 2.02;
        f += 0.03125 * noise(p);
        return f;
    }

    // --- Accretion Disk Function ---
    vec3 getDiskColor(vec3 p_disk, vec3 ray_dir, float r_s) {
        float r = length(p_disk.xz);

        float alpha = (r - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius);
        alpha = pow(alpha, 0.8);

        // VVV CHANGE: Hotter inner color
        vec3 innerColor = vec3(1.0, 0.8, 0.6); 
        vec3 outerColor = vec3(1.0, 0.5, 0.0);
        vec3 baseColor = mix(innerColor, outerColor, alpha);

        float disk_angle = atan(p_disk.z, p_disk.x);
        float rotated_disk_angle = disk_angle + uTime * uDiskRotationSpeed * (1.0 / (r + 0.0001)); 
        vec3 rotated_pos_for_noise = vec3(cos(rotated_disk_angle) * r, 0.0, sin(rotated_disk_angle) * r);

        float n = fbm(vec3(rotated_pos_for_noise.xz * uDiskDensity, uTime * 0.1));
        n = pow(n, 1.5);
        n = max(n, 0.1);

        float orbital_speed = uOrbitalSpeedFactor * sqrt(r_s / (r + 0.0001));
        vec3 orbital_direction = normalize(vec3(-p_disk.z, 0.0, p_disk.x));
        vec3 orbital_velocity = orbital_direction * orbital_speed;

        float doppler = dot(orbital_velocity, -ray_dir);

        vec3 finalColor = baseColor * n;
        
        // VVV CHANGE: Stronger Doppler brightness and color shift
        finalColor *= mix(0.3, 2.0, doppler * 0.5 + 0.5); // More brightness contrast
        finalColor += mix(vec3(0.0, -0.2, -0.3), vec3(0.3, 0.2, 0.0), doppler * 0.5 + 0.5); // More color shift

        float grav_redshift = sqrt(1.0 - r_s / r);
        finalColor *= grav_redshift + 0.1;

        return finalColor * uDiskBrightness;
    }

    // --- Main Ray Tracing Function ---
    vec4 traceRay(vec3 ro, vec3 rd, float r_s) {
        vec3 p = ro;
        vec3 v = rd;
        float r_sq_s = r_s * r_s;
        
        float angularMomentum_sq = dot(cross(p, v), cross(p, v));

        for (int i = 0; i < uMaxIterations; i++) {
            float r = length(p);

            if (r < r_s * 1.01) { 
                return vec4(0.0, 0.0, 0.0, 1.0);
            }
            
            if (r > FAR_PLANE) {
                return vec4(0.0, 0.0, 0.0, 1.0);
            }

            if (r < 0.0001) { return vec4(0.0); }
            
            vec3 r_hat = p / r;
            vec3 acc = - r_hat * (1.5 * r_sq_s * angularMomentum_sq) / (pow(r, 5.0) + 0.0001);
            
            v += acc * uStepSize;
            v = normalize(v);
            
            vec3 p_prev = p;
            p += v * uStepSize;

            if (p_prev.y * p.y <= 0.0 && abs(v.y) > 0.0001) {
                
                float t = -p_prev.y / v.y;
                
                if (t >= 0.0 && t <= uStepSize) { 
                    vec3 hit_pos = p_prev + v * t;
                    float hit_r = length(hit_pos.xz);
                    
                    if (hit_r >= uDiskInnerRadius && hit_r <= uDiskOuterRadius) {
                        vec3 disk_color = getDiskColor(hit_pos, v, r_s);
                        return vec4(disk_color, 1.0);
                    }
                }
            }
        }

        return vec4(0.0, 0.0, 0.0, 1.0);
    }


    void main() {
        // --- 1. Setup Ray ---
        vec2 uv_normalized = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
        uv_normalized.x *= uResolution.x / uResolution.y;

        float fov_rad = 0.5 * PI * (uFov / 180.0);
        float tan_fov = tan(fov_rad);

        // Construct world-space ray direction
        vec3 forward = normalize(uLookAt - uCameraPosition);
        
        vec3 right;
        vec3 up;
        if (abs(forward.y) > 0.999) {
            right = vec3(1.0, 0.0, 0.0);
            up = normalize(cross(right, forward));
        } else {
            right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
            up = normalize(cross(right, forward));
        }

        vec3 ray_direction_world_space = normalize(right * uv_normalized.x * tan_fov + up * uv_normalized.y * tan_fov + forward);
        vec3 ray_origin = uCameraPosition;
        
        // --- 2. Trace Ray and Get Final Color ---
        gl_FragColor = traceRay(ray_origin, ray_direction_world_space, uSchwarzschildRadius);
    }
`;

// --- Create Full-Screen Quad ---------------------------------------------------
const geometry = new THREE.PlaneGeometry(2, 2); 
const blackHoleMaterial = new THREE.ShaderMaterial({
    uniforms: blackHoleUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    depthWrite: false,
    transparent: false
});
const quad = new THREE.Mesh(geometry, blackHoleMaterial);
scene.add(quad);

// --- Animation Loop ------------------------------------------------------------
const animate = () => {
    const elapsedTime = clock.getElapsedTime();
    blackHoleMaterial.uniforms.uTime.value = elapsedTime;
    blackHoleMaterial.uniforms.uCameraPosition.value.copy(camera.position);

    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
};

// Start the animation
animate();