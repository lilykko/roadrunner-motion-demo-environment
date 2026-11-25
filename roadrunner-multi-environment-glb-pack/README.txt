# Roadrunner Multi-Environment GLB Asset Pack

This pack contains five procedural GLB environment assets for the Roadrunner Three.js demo.

## Files
- `environments/flat-ground.glb`
- `environments/hilly-terrain.glb`
- `environments/obstacle-park.glb`
- `environments/sandy-beach.glb`
- `environments/urban-sidewalk.glb`
- `environment-manifest.json`

## Coordinate and scale conventions
- Units: meters
- Up axis: +Y
- Ground centered at X=0, Z=0
- Recommended scene footprint: 3.4 m x 3.4 m
- Robot start position: (0, 0, 0); each Ground mesh is centered to y=0 at X=0, Z=0
- Ground surface mesh node is named `Ground`
- Collision obstacle nodes begin with `Obstacle_`
- Decorative-only nodes begin with `Decor_`

## Add to the repository
Copy the `environments` folder into the repository root (alongside `studio.js`, `index.html`, and `motion.js`), so the files are available at:
`./environments/<filename>.glb`

If your app uses a `public/` directory and a build system, place them under `public/environments/` and adjust the loader paths accordingly.

## Important integration notes
1. Use `GLTFLoader` to load each GLB.
2. Keep the robot model separate from the environment group.
3. To sample terrain, raycast only against the mesh named `Ground`.
4. Detect obstacles separately using meshes named `Obstacle_*`.
5. Do not include `Decor_*` objects in collision detection.
6. The current Roadrunner demo uses Y-up and a motion range of approximately +/-1.35 m in X/Z. These assets are centered and sized for that range.
7. The current demo's click-to-move code intersects a fixed y=0 plane. To work correctly on sloped terrain, update the click target and motion logic to sample the `Ground` mesh rather than relying on a fixed plane.

These assets provide geometric height variation and named obstacle meshes. They do not implement realistic sand deformation, friction, wheel slip, or full rigid-body physics by themselves.
