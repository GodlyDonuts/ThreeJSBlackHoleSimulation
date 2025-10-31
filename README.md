# Relativistic Black Hole Visualization with Three.js

This project is a real-time technical demonstration of a Schwarzschild black hole and its accretion disk, built using Three.js and custom GLSL shaders.

It renders a full-screen quad and performs all calculations within the fragment shader. This allows for the simulation of complex physical phenomena like gravitational lensing, Doppler shift, and gravitational redshift in real-time.

-----

## 🚀 Features

  * **Gravitational Lensing:** Light rays are bent as they pass near the event horizon, distorting the view of the accretion disk and creating the characteristic "Einstein ring" effect.
  * **Accretion Disk:** A flat, orbiting disk of matter is rendered between an inner and outer radius, providing the primary visual element.
  * **Doppler Shift (Beaming):** The side of the disk moving towards the camera appears significantly brighter and slightly blue-shifted, while the side moving away is dimmer and red-shifted, simulating relativistic beaming.
  * **Gravitational Redshift:** Light escaping from deep within the black hole's gravity well loses energy, appearing redder and dimmer. This is most noticeable at the inner edge of the disk.
  * **Dynamic Gaseous Texture:** The accretion disk uses Fractal Brownian Motion (FBM) noise to create a dynamic, hot, gaseous texture that rotates and evolves over time.

-----

## 🔧 How It Works: A Technical Deep Dive

The visualization is achieved with a single `THREE.PlaneGeometry` that covers the entire screen. The magic happens inside the custom fragment shader (`fragmentShader` in `main.js`).

1.  **Scene Setup:** The Three.js scene is minimal. It contains only a camera and a full-screen quad.
2.  **Ray Tracing:** The fragment shader is a ray tracer. For each pixel on the screen, it calculates a view ray starting from the `uCameraPosition`.
3.  **Physics Simulation:** The shader iteratively "steps" the ray through a simulated curved spacetime. It uses a simplified physics model (based on the particle's angular momentum) to calculate the gravitational acceleration at each step, bending the ray's path.
4.  **Hit Detection:** During the ray's journey, the shader checks for two main intersections:
      * **Event Horizon:** If the ray's radius `r` falls below the `uSchwarzschildRadius`, it is considered "captured," and the pixel is colored black.
      * **Accretion Disk:** If the ray crosses the XZ plane (`y=0`) within the disk's `uDiskInnerRadius` and `uDiskOuterRadius`, it is considered a "hit."
5.  **Color Calculation:** When the accretion disk is hit, the `getDiskColor` function is called. This function calculates the final color based on:
      * **Temperature:** A color gradient from a hot inner edge (yellow/white) to a cooler outer edge (orange/red).
      * **Texture:** FBM noise is sampled based on the hit position and time.
      * **Relativistic Effects:** The orbital velocity is calculated at the hit point to determine the **Doppler shift**. The gravitational potential is used to calculate the **gravitational redshift**. These two effects modify the final brightness and color of the disk.

-----

## 💻 How to Run

Because this project uses ES Modules (`importmap` in `index.html`), you must run it from a local server. You cannot simply open the `index.html` file directly in your browser.

1.  **Clone or download** this repository.

2.  **Navigate** to the project directory in your terminal.

3.  **Start a local server.** A simple way is to use Python's built-in server:

      * **Python 3:**
        ```bash
        python -m http.server
        ```
      * **Python 2:**
        ```bash
        python -m SimpleHTTPServer
        ```

4.  **Open your browser** and go to `http://localhost:8000`.

-----

## 🛠️ Technology Stack

  * **Core:** [Three.js](https://threejs.org/) (r163)
  * **Language:** JavaScript (ES Modules)
  * **Shaders:** GLSL (Vertex and Fragment)
  * **Markup/Styling:** HTML5, CSS

-----

## ⚙️ Customization (Key Shader Uniforms)

You can easily tweak the black hole's appearance and behavior by modifying the `blackHoleUniforms` object at the top of `main.js`.

| Uniform | Description |
| :--- | :--- |
| `uSchwarzschildRadius` | The radius of the event horizon. |
| `uDiskInnerRadius` | The inner edge of the accretion disk. |
| `uDiskOuterRadius` | The outer edge of the accretion disk. |
| `uDiskBrightness` | Overall brightness multiplier for the disk. |
| `uDiskDensity` | The scale/tiling of the noise texture on the disk. |
| `uOrbitalSpeedFactor` | Multiplier for the disk's orbital speed (strongly affects Doppler shift). |
| `uDiskRotationSpeed` | Overall rotation speed of the disk noise texture. |
| `uMaxIterations` | Ray tracing quality. Higher is more accurate but slower. |
| `uStepSize` | Ray tracing step size. Smaller is more accurate but slower. |

-----

## 📄 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).
