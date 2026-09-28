# Cell morphology mesher

Turns an SWC skeleton into a single closed, smoothly blended surface mesh, in a pool of Web Workers. Where a
neurite runs alone its surface is swept as a tube; around branch points, the soma and near contacts a voxel field
is meshed with surface nets and simplified with meshoptimizer's WASM quadric simplifier.

The in-depth reference: how each step works, why it is done that way, and what it was measured to cost. For the
overview (what runs where, diagrams of a build, and where to change what) see [../README.md](../README.md).

Ported from the `local-morph-meshing` proof of concept (the POC), whose notes these are. The build parameters have
fixed defaults in the platform (`DEFAULT_BUILD` in `../constants.ts`; see *Build parameters*), and the viewer's
Debug menu shows what a build did and has the POC's controls. "The sample cell" and "the bundled cell" are the mouse V1 L4 neuron in
`src/__tests__/cell-morphology/fixtures/`.

Coordinates are shifted so the soma centre is the origin (the bounding-box centre if the file has no soma
points). The view orbits around that point and the exports use the same frame.

## How it works

1. **Parse.** `swc.ts` reads the SWC columns, resolves parent links and
   regroups the tree into *sections*: unbranched chains of points of one type.
   Each neurite section starts at its parent point so the chains connect. The
   soma becomes one sphere (single point, the three-point convention, or a
   sphere fitted to a contour), which gives the centre. `soma.ts` sizes
   the soma from its stems instead, ignoring the traced soma radius and
   contour: an arbor whose first sample is 5 µm or more from the centre is
   valid and emanates from that sample, the base sphere has 0.8 × the nearest
   valid one's distance for its radius, and an arbor starting beyond 25 µm
   gets a first sample added 25 µm along the ray to it, which then stands for
   the traced one, with the radius interpolated between the base radius at
   the centre and the traced sample's. An arbor starting within 5 µm neither
   sizes the soma nor emanates. The statistics show the counts and the base
   radius next to the fitted one. With no valid arbor, which is the case in
   the bundled cell and in the projection neurons from the platform (every
   stem starts within 3 µm of the centre), the fitted sphere stands, but it
   is raised to 5 µm (`SOMA_MIN_RADIUS`) where it is smaller: the projection
   neurons mark the soma with a placeholder of 0.088 µm, which left their
   stems pinching to a point, and of 32 traced somata the smallest has a
   radius of 4.65 µm. The minimum stops at the nearest point where an arbor
   forks, which a soma does not hold. Every arbor is then cut where its first
   section first gets 1.25 × the radius from the centre (the traced cells'
   stems leave at 1.27 × on average), and emanates from there, which makes
   the base sphere, at 0.8 × that distance, the radius itself.

   The mesh's soma is the base sphere with a *neck* to every valid or cut arbor
   (`collectPrimitives` in `mesher.ts`): the cone tangent to the base
   sphere and to a sphere of the target's radius at the target, which is the
   side of their hull. The field measures a rounded cone from the orthogonal
   projection onto its axis, which sets the cone on the equators of its end
   spheres (step 7), so a neck laid from centre to centre would stay inside
   the base sphere for most of its length and come out of it at an edge. The
   neck is laid between the two circles where the tangent cone touches the
   spheres instead, and leaves the base sphere without an edge. Sphere and
   necks are one primitive of the field, so within it the distances combine
   by a minimum and nothing adds up twice. It is a smooth minimum
   (`smoothMin` in `field.ts`), folded over the parts in their order: a
   plain one leaves a crease wherever two necks cross, up to 90° deep between
   a thin neck and a thick one, and a simplified mesh zigzags across it, each
   vertex shaded as one side or the other. Folded, the parts meet in a round
   0.4 of the local radius wide (`SOMA_ROUNDING`), whatever the soma blend;
   where they are tangent, a neck and the base sphere around the circle where
   it leaves it, the surface swells by a tenth of the radius. The round
   reaches as far from a part as the part's band does (at a soma blend of
   0.2), so a part's share in it fades out before its band ends
   (`somaFade`), and the field has no step there. A soma of one sphere is
   folded with nothing, so it stays what it was. The arbor's
   section starts at the target rather than at the soma point; the cone meets
   its tube there at the cone's half-angle, and the two blend as a section
   does with its parent at a fork (step 3). The preparation (step 2) keeps a
   valid arbor's first sample as a point of its section, wherever it moves
   it, and the neck follows it there; a cut arbor's neck ends where its
   section as prepared first gets the cut distance out. The mesh statistics
   say how many necks the soma has.
2. **Prepare.** `prepare.ts` smooths radii and paths along each section
   (a running median over 3 µm against single-node spikes, then a Gaussian of
   the chosen σ; branch points and tips stay put, and a child section starts
   exactly where its smoothed parent ends), resamples every axon section at a
   fixed step of arc length (*Axon step*, 5 µm by default: the ends stay, the
   points between are spaced evenly by no more than the step, each with the
   mean radius over its step, so that a millimetre of axon is a few hundred
   rings of its tube rather than a thousand; what is lost is the chord error
   where the axon bends), keeps only the two ends of a dendrite section
   shorter than the sum of its end radii (the end spheres cover it; neither
   bundled cell has one) and then simplifies every section
   with Ramer–Douglas–Peucker on (x, y, z, 2r). Traced radii are noisy: in the
   bundled cell 43% of consecutive axon nodes differ by more than 1.5× within
   about a micron. The whole pass takes ~20 ms and halves the point count at
   the default tolerance, but the mesher's cost scales with surface area, so
   it is about a cleaner mesh and lighter skeletons rather than speed.

   *Untangling (on in the platform's build).* A neuron is a tree, and its
   fibres do not pass through each other. Tracings have them do it all the
   same: depth is the weak axis of a light microscope, and an axon that ran
   over a dendrite comes out running through it. The mesher can only weld what
   touches (step 3), and every weld is a handle that the cell does not have:
   8 on the sample cell, 28 on a projection neuron. `untangle.ts` moves
   such fibres apart between the smoothing and the simplification, until their
   surfaces are two and a half voxels from each other, which is what it takes
   for the layout not to see them touch once the paths are simplified. Only
   fibres that do not belong together count: not the sections around a fork,
   as far as they blend, and not the two arms of a fold. The thinner fibre
   gives way, by the squares of the radii, so an axon goes around a dendrite
   and two fibres alike share the way. A fibre moves across its own axis and
   never along it: where one goes through another's middle, the way from the
   other's axis to it leads along itself, so it goes across both. The points
   that run along one fibre agree on the side they go to over 8 µm of path to
   either side, or one that lies inside another for tens of microns (the
   projection neuron has two dendrites traced on top of each other for 30 µm)
   would be sent up here and down there, and wind around it. What is asked of
   a point is spread along the section over six times as far as the point
   goes, so the path bends gently and tubes can still be swept along it; branch
   points and what lies in the soma stay put, and nothing moves farther than
   3 µm. On the sample cell 12 pairs of sections touch, 148 µm of 30 000 µm of
   path move, by 1.07 µm at most, and the surface comes out with no handle at
   any voxel from 0.08 to 0.5 µm; on the projection neuron 32 pairs, 589 µm of
   247 000, 1.10 µm, and 2.5 handles are left of 28.5 (a fold of one axon, two
   stems that cross inside the soma's star, and a vertex shared by two sheets).
   It takes 40 ms and 200 ms, once for a cell and a smoothing: the result is
   kept. It edits the anatomy rather than rendering it, by less than a tracing
   is off in depth, and the statistics say what it did.
3. **Field.** `mesher.ts` accumulates a scalar field on a sparse voxel
   grid. For each section it takes the exact signed distance to the section's
   surface (minimum over its rounded-cone segments, so consecutive segments
   never bead) and adds a compact kernel of that distance divided by a local
   blend scale `max(blend × radius, voxel)`. An isolated section has its
   surface exactly at field value 1; where sections meet (branch points, the
   soma with its necks) their contributions add up, which rounds the junction
   like a metaball.

   Not everything adds up with everything, though. Added up without
   distinction, the kernels also act on whatever merely passes by: an axon
   within a dendrite's band (two blend scales, a radius at blend 0.5) comes out
   swollen towards it, and welded to it if the gap is small, and every such
   place is a patch of voxels for step 9. So `kin.ts` divides the skeleton
   into *families*, and the field is the largest of the families' sums. The
   sections that meet at a fork, or the soma and its stems, are one family
   from the fork on for as long as they stay within each other's reach (a
   *star*); it ends where a section has been out of the others' bands for a
   band's width, where nothing but the section itself has a say, so that the
   cut leaves no trace (within a section the distance is a minimum over
   segments, a union already), and after eight band widths whatever happens:
   two branches that run side by side for tens of microns are two fibres. What
   is left of a section between its stars is a family of its own. Fibres of
   different families have no effect on each other, however close, unless
   they *touch* (their surfaces come within a voxel): then they are one surface
   whatever the field does, and the sum makes a better one of it than a union
   would. Two tubes that lie against each other are less than a voxel apart
   over a long way, and a union on a grid flickers between joined and apart
   all along it, a handle for every flicker: a projection neuron came out with
   47 handles that way, against 30 for the sum. So each of the two is cut
   where it comes within the other's reach and where it has left it again, and
   the parts between are a family, a *weld*, and blend as they used to. The
   statistics say in how many places fibres touch; a neuron is a tree, and
   each of them is a handle of its surface.
   Only 8³-cell blocks inside some segment's influence band are allocated, so
   memory scales with surface area rather than bounding-box volume. Samples
   beyond the kernel's support are rejected on the squared distance before any
   square root, and a section is flushed into the field from the list of
   samples it actually wrote.
4. **Extract.** The level set is pulled out with surface nets, extended with
   one vertex per connected group of inside corners per cell so that saddle
   configurations do not pinch two sheets together. Everything works from one
   9-bit inside mask per row of samples: blocks entirely inside or outside are
   skipped, a row of cells without a crossing costs two bit operations, the
   crossing edges of a row are XORs of neighbouring row masks, and a 256-entry
   table gives the corner components of a cell. Adjacent blocks share boundary
   samples with bitwise-identical values, so the mesh is seamless and closed
   across block boundaries. Vertices carry the SWC type of their most interior
   sample for colouring. Edge crossings are kept 5% of an edge away from its
   ends, so that a sample whose float32 value is exactly 1 does not put the
   vertices of all the cells around it on one spot.
5. **Project.** A surface-nets vertex is the mean of its cell's edge
   crossings, which on a tube a few voxels wide lands up to half a voxel
   inside the true surface, by an amount that depends on how the tube sits in
   the grid: thin neurites come out notched. `field.ts` evaluates the
   field and its gradient anywhere from the slab's segments (it agrees with
   the grid samples to float32 rounding), and `refine.ts` moves every
   vertex onto F = 1 with up to three Newton steps. On the sample cell at
   0.2 µm this halves the RMS distance of the triangles from the surface and
   costs about a quarter of the extraction time. Where the GPU extracted the
   slab it does this too (step 10), from the same field and on the vertices it
   has already got.
6. **Simplify.** Surface nets spend most of their triangles on flat and
   cylindrical stretches, and meshoptimizer's quadric edge collapse takes them
   out. It cannot be given a slab as it is, though: it works in float32 on
   positions scaled to the mesh's extent, and an error of a fraction of a
   voxel on a neuron a millimetre across is, squared, hundreds of times below
   the rounding of its quadrics. It then accepts collapses more or less at
   random, which pinches tubes shut and leaves triangles a voxel off the
   surface, whatever the voxel size. So the simplifier gets one cubic cell of
   the mesh at a time (128 voxels, less for small errors) with positions
   relative to the cell; a cell's open edges stay locked, and a second round
   over cells shifted by half a cell removes the vertices the first round had
   to keep along its walls. The result is then checked: no edge may be used
   twice in the same direction (a tube closed off by two back-to-back
   triangles shows up as one), no triangle the simplifier made may face
   against the field's normals at its corners (a fold, where it has left a
   vertex outside the ring of its neighbours), and none may leave the field's
   surface, at check points a voxel apart, by more than the *Mesh simplify*
   error or half the local radius. The raw vertices around a failure are
   locked and the cells they touch are redone, and only what those cells make
   is sampled again; a few hundred triangles per million fail, nearly all of
   them folds, and two to four rounds settle it. The simplifier itself is
   asked for a third of the error, because its measure is an RMS. Surviving
   vertices keep their positions, the surface stays closed, and vertices on
   slab seams are locked so the slabs still stitch. A triangle without area,
   over three vertices on a line of which the middle one is locked, passes
   all of this; it is taken out afterwards by splitting the triangle across
   its long edge at the middle vertex, which changes neither the surface nor
   the triangle count. Left in, it would do no harm but at a seam, where both
   slabs can lay one over the same three vertices and leave an edge with four
   triangles. Where the GPU extracted the slab, it samples the check points
   too (step 10).
7. **Shade.** The vertices that are left get their normals from the segments,
   not from the triangles, so a tube at the radius floor, a square to hexagon
   in section, still shades as a round one. They are not quite −∇F, though.
   The field measures a segment from the orthogonal projection onto its axis,
   which makes it a cone set on the equators of its end spheres rather than
   the cone tangent to them. Where the radius changes with slope τ, the sphere
   at a skeleton point stands out of the cone on its thinner side, and −∇F
   turns by the whole of atan τ where the two meet: twice at every skeleton
   point, by 10° to 30° on a thick stem tapering out of the soma. The
   simplifier sees positions only and leaves a vertex here and there on either
   side of such a ring, and interpolating between them shades the stem in
   light and dark patches the size of its triangles. `FieldSampler.shade`
   keeps the field's sum over sections and each section's weight in it, and
   changes the direction in which a section pulls: that of the hull of a
   segment's two end spheres, whose side is tangent to both, so the normal
   runs on smoothly past a skeleton point. Hulls are larger than the cones
   they stand in for, so which hull answers is for the field to say: that of
   the segment it has the vertex on, and the neighbour's only across the
   sphere that the two share. What remains are the creases that the surface
   has itself: on the inside of a bend, where the taper steepens, and where a
   sphere much larger than the neck behind it folds against that neck. There
   the field hands a point from one segment to the next and the normal turns
   by the whole fold; which side a vertex on the fold belongs to is a matter
   of rounding, and a jagged stem came out mottled along the inside of its
   bends. So the hand-over is soft: every segment of the section that is no
   more than a quarter of the blend scale farther from the vertex than the
   nearest has a say in the direction, less the farther it is, and the normal
   turns across a fold over a few hundredths of the radius to either side, as
   over a rounded edge. The geometry is untouched; on a stem whose radius
   swells from 0.4 to 2 µm and back, the normals of neighbouring vertices
   differ by 2.5° on average instead of 4.8°, at worst by 9° instead of 29°,
   and on the sample cell's stems of 1 to 2 µm the share of the surface whose
   normals differ from their neighbours' by more than 10° falls from 4.2 % to
   1.3 %, which is what their triangles' own normals come to (1.0 %). It costs
   a few per cent of the extraction time, since it runs on the few vertices
   that survive. The soma's necks (step 1) are the exception: each is laid so
   that its cone is the surface meant, and the hull of its own end spheres
   would be a steeper cone, so they are shaded as the cones they are. Nor is
   there a hand-over within the soma: its parts meet in a round (step 1), and
   pull on the normal as they fold in the field.
8. **Spread over workers.** `planMesh` cuts the block grid into slabs of block
   layers along one axis, choosing the axis and the cut positions so that every
   slab gets about the same amount of splatting work. `pool.ts` hands the
   slabs to a pool of workers (four slabs per worker, so uneven slabs even out
   and less field memory is live at once), then one worker stitches them.

   A sample's value is the sum of the kernels of the sections reaching it,
   added in section order. Every slab uses the same global grid and section
   order, so samples on both sides of a cut come out bitwise identical to a
   single-slab run and the stitched mesh matches it up to vertex order — the
   tests check exactly that. Faces along the bottom of a slab need cells from
   the slab below, so each slab also fills the two sample planes under its
   first block layer and extracts that one cell layer; those halo vertices are
   matched to their owners by cell and corner during the merge. A halo vertex
   whose owner was collapsed away by the simplification has all of its faces in
   the upper slab and simply becomes a vertex of its own.

   A new build supersedes the running one: its queued slabs are dropped, so a
   rebuild does not wait for the previous mesh to finish.
9. **Tubes where a neurite runs alone (always, in the platform's build).**
   Steps 3 to 7 cost in proportion to the surface, and nearly all of a
   neuron's surface is plain tube: no other section's band reaches it, so the
   field there is that one section's and F = 1 is exactly the surface of its
   rounded cones. That holds for 90 % of the sample cell's cable and for
   98.6 % of a whole-brain projection neuron's. Voxels are a poor way to get
   at it. Surface nets leave the facets of a thin tube tilted against its axis
   (by 14° RMS at a radius of one voxel), the quadric error takes the tilt for
   shape, and the simplifier stops after a voxel or two of sliding: a straight
   tube at the radius floor loses two fifths of its triangles where two rings
   would do.

   `classify.ts` finds the plain stretches. Pieces of the sections' paths
   that are of one family (step 3) interact when one's band, plus a voxel,
   reaches the other's surface; pieces that are not, when their surfaces come
   within a voxel, which is what makes a weld of them. Both are then complex,
   and so are skeleton points that a ring cannot follow (a sharp bend, a steep
   taper: the sphere around the point shows). A fibre that passes another
   within its band without touching it stays a tube. The search goes by
   levels, since it is serial: chunks of 8 µm of path are hashed, the segments
   of chunks that share a cell are tested by their exact distance, and only a
   segment that comes close to something is cut into pieces.

   `tubes.ts` sweeps a plain stretch: a ring at each end, at every skeleton
   point (in the plane that bisects the bend, where the two cones meet) and
   along long segments up to the *Tube aspect*; vertices at equal angles in a
   rotation-minimising frame, each found by a ray cast from the axis, with the
   shading normal of step 7 there, which a ring at a skeleton point gets the
   same all the way round (from −∇F, rounding would give some of its vertices
   the cone's normal and others the sphere's); as many around as the chord
   error r (1 − cos(π / n)) allows
   within the *Mesh simplify* tolerance (never more than half the radius), less
   what the skeleton point next to them takes. A cone is a ruled surface, so
   the strips between rings add no error however long they are. A free end
   gets the hemisphere it has in the field.

   A ring's vertices do not lie on the surface but at 2 / (1 + cos(π / n))
   times the way to it, so that they stand as far outside it as the middle of
   a chord lies inside. A thin fibre is a hexagon at any sensible tolerance,
   and a hexagon inscribed in its circle is off by 13 % of the radius on one
   side and has 83 % of the circle's area; this one is off by 7 % on either
   side and has 95 %.

   Interacting pieces are clustered into patches, and a patch is meshed by
   steps 3 to 7 from a copy of the skeleton around it, whose sections are cut
   off a little beyond it. Its surface is therefore closed, with a capped stub
   on every section that leaves it. `clip.ts` cuts each stub away at a
   plane across its section: the cut is the one curve of triangles, connected
   through edges that meet the plane, that goes round the axis and comes
   closest to it (the other arm of a hairpin may cross the plane nearby, and
   on a coarse stub the triangles around a vertex that dips across the plane
   meet it in a small curve that can come nearer still); vertices next to the
   plane are moved into it; the new vertices are put on the exact surface; and
   what hangs together beyond the plane is removed. That leaves a loop in the
   plane, and the tube starts a collar's length farther on with a ring of its
   own. `hybrid.ts` fills the collar when it merges, by walking around
   both loops and advancing on the side where the new edge spans the smaller
   angle. Tubes and patches share no samples, so they are meshed in any order
   on any worker, in batches that are compact in space (they become the render
   chunks) and about equal in work; a patch too large for one worker's share,
   the soma with what grows out of it as a rule, is cut into slabs like a
   whole cell and spread over the workers, or the GPU. The cut has to be the
   section's circle, so a plane keeps clear of the skeleton's bends: next to
   one, the segment beyond it lies askew behind the plane and comes through it
   beside the circle.

   *Calibre.* One grid holds a fibre from a radius of one voxel on (step 3),
   and with voxels throughout, everything thinner is thickened to that: 42 %
   of the sample cell's axon at 0.158 µm, 77 % of a projection neuron's, whose
   axon surface comes out 25 % too large. A tube needs no grid, and a patch
   has a grid of its own. So with the tubes on, the sections keep their traced
   radii, and every patch gets a voxel fine enough for the thinnest fibre in
   it; *Voxel size* is the coarsest one, for the soma and whatever is thick.
   All the lengths that were counted in voxels (a fibre's blend scale, and with
   it its band; the margins of the layout) go by the voxel that the fibre's own
   radius calls for, so thin fibres blend over distances of their own size
   whatever the voxel, and the patch around a thin branch point is as many
   voxels across as one around a thick one: refining it costs next to nothing.
   What costs is a thin fibre on something thick, and the soma's patch is most
   of the work as it is. So the patches may take as many voxels again as they
   have at the coarsest voxel, handed out from the cheapest patch up, none
   goes beyond 2 M band voxels or below a quarter of *Voxel size*, and a patch
   that stays coarser than its fibres call for thickens them to its floor as
   before; the tube that leaves it starts at that radius and comes down to
   its own at a slope of a quarter. The soma's necks are laid again at the
   floor, between the thickened spheres, so that they stay tangent to them (a
   neck thickened once laid is tangent to neither). The statistics say how
   fine the voxels got and how much of the cable is thicker than traced: none
   of the sample cell's at the default voxel and 0.2 % at 0.5 µm, 0.002 % of
   the projection neuron's. The axon's area is then 0.8 to 1.7 % above the
   traced skeleton's for the sample cell at voxels from 0.0625 to 0.25 µm, and
   1.8 to 2.2 % for the projection neuron from 0.1 to 0.25 µm, where it was
   anything from 2 % below to 48 % above (what is left are the hexagons).

   Where nothing is thinner than a voxel the surface is the same as without
   the tubes. Measured on the sample cell at 0.1 µm, against the
   sections' own surfaces, no tube triangle is farther off than the tolerance
   (half a voxel, or half the radius where that is less; 1.7 M check points,
   worst 0.71 of it) and 2 of 86 000 collar points are, by a tenth of it; on
   the projection neuron none of 16 M and none of 104 000. The patches are
   voxel meshes, checked against their own fields as ever. If a build fails (a
   clip that finds no loop, a ray that finds no surface) the pool builds the
   voxel mesh instead and the statistics say why.
10. **GPU (wherever the browser has WebGPU).** `gpu-slab.ts`
   moves steps 3 and 4 of every slab into WebGPU compute shaders; the workers
   keep the planning, the simplification and the merge.

   *Field.* The CPU scatters segments into samples; the shader gathers. The
   worker bins the slab's segments into per-block lists (dropping the corners of
   a segment's bounding box that its band cannot reach), and one invocation per
   row of nine samples walks its block's list in section order, keeping the
   minimum distance within a section (the soma's smooth one, folded in the
   same order as on the CPU) and adding the kernel when the section
   changes. Seams still rely on a sample having one value wherever it is
   computed, so a sample's value depends only on its global integer
   coordinates and on the segments whose integer sample box contains it, the
   same boxes the CPU loops over. WGSL has no f64: positions are in voxel units
   and a segment's start is an integer sample plus a fraction, so the offset to
   a sample is an exact integer difference minus that fraction and its error
   does not grow with the cell's extent.

   *Extraction.* Surface nets emit a varying number of vertices per cell, so a
   count pass first leaves the running totals per cell and per row inside each
   block. The per-block totals are read back (8 bytes a block), summed into
   offsets, and two more passes write the vertices and the quads, which find
   their four cells' vertices through those offsets, in neighbouring blocks
   where needed. Only the raw mesh comes back: 91 MB for the sample cell at
   0.25 µm, against 155 MB for the field blocks the surface crosses.
   The simplifier and the stitching run on the workers as before.

   *Which patches go there.* A patch rides in a batch and is splatted on its
   worker, unless it is large enough to be cut into slabs of its own (step 9).
   With the field on the GPU that threshold is the wrong one: the device is
   idle 97 % of the time and a round trip costs about a millisecond, which is
   less than splatting all but the smallest patch. So a GPU backend lowers it
   to ten thousand band voxels and nearly every patch takes the slab road; a
   patch that is not big in its own right still gets a single slab, since a
   slab cut locks the vertices along it and would keep triangles the batch
   would have dropped. On the sample cell at 0.1 µm this turns 73
   work items into 359 and takes the field the workers still had to do from
   1387 ms to 389 ms, summed over the build.

   *Projection (step 5).* The field costs the GPU next to nothing - 15 ms of a
   2.1 s build on the sample cell at 0.25 µm, against 55 ms for all four
   passes together - while the same arithmetic at arbitrary points, which is
   what steps 5 to 7 are, took the workers about half of the build. So the
   projection runs there too. A point is looked up the way a sample is: the
   block it falls in, through a hash of the block coordinates that
   `binSegments` leaves with the lists, and then that block's segments, in
   section order, exactly as `FieldSampler.sample` walks a fine cell's. The
   list is the segments whose integer sample box touches the block rather than
   those whose band reaches the point, but the two differ only at the edge of
   a band's bounding box, where a point is a band away from the axis and both
   the kernel and its slope are zero. A point is an integer voxel plus a
   fraction, as a segment's start is, so it keeps the precision the field pass
   has. The vertex pass leaves every vertex in that form, the projection moves
   it onto F = 1 with the Newton steps of `projectVertices` and writes the
   displacement, the unit normal and the radius of the closest section; the
   few vertices whose steps leave the blocks the slab was given (the top cell
   layer can step past them) come back marked and the worker finishes them.
   On the sample cell at 0.25 µm the extraction and projection of all 44 slabs
   fall from 688 to 223 ms.

   *Check (step 6).* The simplifier is meshoptimizer's and stays on the
   worker, but half of what the simplification cost there was its check:
   sampling every triangle it made at a lattice of points a voxel apart, up
   to 88 of them on a triangle twelve voxels long. The projection leaves the
   vertices where it put them, as integer voxel and fraction, so the device
   still has everything the check needs when the simplifier is done: the
   worker sends the triangles to check (their vertex numbers), one
   invocation takes the lattice of one triangle with the same point query,
   and a verdict per triangle comes back. A point outside the blocks the slab
   was given leaves its triangle undecided, and the worker samples it, as it
   does the triangles of a slab with fewer than 256 to check, which a round
   trip would cost more than it saves. The pass loop is written once, as a
   generator that hands out the triangles to check, so that the workers'
   own simplification runs it as before, to the bit. On the sample cell at
   0.25 µm every one of the 802 051 verdicts of a build agreed with the
   worker's (7 triangles failed, on both), 55 came back undecided, and the
   mesh is the one the worker's check gives.

   All three together: at 0.1 µm with the tubes on, a GPU build
   takes 48 % of a CPU build's time, where it took 71 %, and the voxels
   throughout at 0.25 µm take 48 %, where they took 80 %. The field is now 11 %
   of the CPU's, the extraction with the projection 38 %, the simplification
   80 %, and half of what is left there is meshoptimizer; the other half is
   waiting, three round trips a slab, which is what to take on next. The
   surface is closed either way and the two volumes agree to five figures.

   Firefox finishes a map only when it polls the device, which it does every
   100 ms or when something is submitted (Bugzilla 1870699). So a readback
   still waiting after 2 ms submits an empty command buffer every millisecond
   until it is done, and a GPU build of the sample cell in Firefox 156 takes
   0.3 s instead of 5.2 s, most of which was waiting. In Chrome and Safari a
   readback is usually done within a millisecond, before the first kick.

   The GPU field differs from the CPU's in the last bits (f32 against f64), so
   a build uses one backend for all of its slabs. The raw surface is the same
   mesh: same vertex and triangle counts, same types, and a few dozen quads
   per million split along the other diagonal where both are equally long. The
   projection is a Newton iteration, so it magnifies that difference where a
   step is taken or dropped either side of its tolerance: at 0.25 µm the
   vertices land within 1.4 × 10⁻² voxel of the workers', where the workers'
   own projection of the GPU field leaves them within 3.6 × 10⁻³ (1.0 × 10⁻³
   and 2.5 × 10⁻⁴ at 0.5 µm). 2 normals in 1.6 M differ by more than a
   thousandth of a cosine, the volume agrees to six figures, and the
   simplifier, which sees the moved vertices, ends up within 0.07 % of the
   workers' triangle count, 0.03 % with the tubes on. If a GPU build ever
   comes back with open quads, the viewer turns the GPU off for the session
   and rebuilds on the CPU, and so it does when the device raises an error or
   is lost (`use-morphology-mesh.ts`). A
   submission that uses a buffer the device could not allocate does nothing,
   and its readback brings back zeros or an earlier slab's data, so every
   readback also checks the device's error scopes, which come back long
   before the map does. Such a failure does not send a tubes build to the
   voxel mesher either, which would need the device too. A device that cannot
   compile the shaders is never used: the pipelines are built before the
   probe answers, and the statistics give the reason.


## Build parameters

The POC had a control for each of these. The platform builds with the POC's defaults, `DEFAULT_BUILD` in
`../constants.ts`; the voxel is 10^−0.9 ≈ 0.126 µm. The Debug menu, behind the `morphology-debug` flag, has the
POC's controls for them, but not for the neurite types, which the eyes set.

| Parameter | In the platform | Meaning |
| --- | --- | --- |
| Smoothing σ (`smoothing`) | 1 µm | Gaussian σ in µm along each section, applied to radii and positions. 0 keeps the traced values. |
| Axon radius (`axonRadius`) | heavily smoothed | *as traced*: the same σ as dendrites. *heavily smoothed*: 5 × σ for the axon radii (paths keep σ), since axon calibre estimates are mostly noise. *constant*: every axon radius becomes the axon's median. |
| Axon step (`axonStep`) | 5 µm | Arc-length step in µm at which every axon section is resampled after smoothing and before untangling: the ends stay, the points between are evenly spaced by no more than the step, and each takes the arc-length-weighted mean radius over its step. Bounds the axon's point count by its cable length, where Simplify bounds the error by the voxel; Simplify is then in effect a dendrite setting. 1 to 5 µm: a finer step than the tracing would only add points. 0 keeps the traced points. |
| Untangle fibres (`untangle`) | on, 2.5 voxels | Move fibres apart where the tracing has them touch without their belonging together, the thinner around the thicker, by 3 µm at most (step 2), until their surfaces are this far apart. Off (0), they are welded where they touch. |
| Simplify (`simplify`) | half a voxel | Ramer–Douglas–Peucker tolerance on path and diameter, in µm. Half a voxel drops about half the points of a typical tracing without changing the mesh. |
| Voxel size (`voxel`) | 0.126 µm | Grid resolution in µm. Triangle count and time scale roughly with 1/voxel². With the tubes it is the coarsest grid: around fibres thinner than the minimum radius the voxels get finer, down to a quarter of it, where that is cheap (step 9). |
| Neurite blend (`blend`) | 0.1 | Blend scale as a fraction of the local radius. Larger values give rounder branch points, and rounder welds where fibres touch. |
| Soma blend (`somaBlend`) | 1 | Same for the soma, sphere and necks alike; controls how smoothly dendrites and axon emerge from it. Along a neck the band follows the neck's own radius, wide at the sphere and narrow at the target. The round where the soma's own parts meet does not follow it: it is 0.4 of the local radius wide at any blend. |
| Min radius (`minRadius`) | 1 voxel | The smallest radius a grid is given, in its voxels. The mesher never goes below 1.0: thinner tubes fall between grid samples and break into pieces (straight tubes survive down to 0.85, the sample axon breaks below 0.9). With the tubes, the grid around thin fibres gets finer voxels to keep to it; with voxels throughout, thinner fibres are thickened to it. |
| Mesh simplify (`simplifyMesh`) | 1 voxel | Largest distance of a triangle from the true surface: what the simplified voxel mesh is checked against the field for, and what sets the number of vertices around a tube. 0 keeps the raw surface-nets mesh in the patches (the tubes then work to a tenth of a voxel). Whatever the value, a simplified triangle never leaves the surface by more than half the local radius, so thin axons are not cut. |
| Tube aspect (`tubeAspect`) | 16 | Most that two rings of a tube may be apart, as a multiple of the edge length around them. The surface is the same at any value; larger means fewer and longer triangles. |
| Tubes | always | Sweep tubes where a neurite runs alone, at its traced calibre, and use voxels only for the patches around branch points, the soma and near contacts, as fine as the fibres there need. Without them (`mesher: 'voxel'`, or when a hybrid build failed) the whole surface comes from one voxel grid, which thickens whatever is thinner than a voxel. |
| Neurite types (`includeTypes`) | the eyes in the key | The axon, basal and apical sections to include. The soma is always included. |
| GPU | where available | Field, surface extraction, projection and the simplification's check in WebGPU compute shaders instead of on the workers. With the tubes, every patch worth a dispatch goes there as a slab of its own rather than riding in a batch. Used whenever the browser has WebGPU and the device builds the shaders; a failed or defective GPU build turns it off for the session and rebuilds on the CPU. The statistics say which backend built the mesh, and why. |


## Timings

Measured on the POC, with its bench script (`npm run bench`, whose flags appear below) and its `gpu-bench.html`
page; neither is ported. Some runs use settings other than the platform's, as each says.

### Tubes and patches against voxels throughout

A whole-brain projection neuron (248 821 nodes, 247 mm of cable, 95 % axon,
6.4 × 5.1 × 8.6 mm), the defaults but for a blend of 0.5, mesh simplify at
half a voxel, a tube aspect of 8, no axon step and no untangling, Node 24 on
an M4 Pro, 12 worker threads, CPU only,
`npm run bench -- --workers 12 --file … [--hybrid]`:

| Voxel | Voxels throughout | Tubes and patches |
| --- | --- | --- |
| 0.4 µm | 1.94 s, 5.11 M triangles | 0.38 to 0.43 s, 3.25 M |
| 0.158 µm | 3.9 s, 11.7 M | 0.52 to 0.54 s, 3.80 M |
| 0.1 µm | 7.2 s, 16.7 M | 0.49 to 0.52 s, 4.17 M |
| 0.0625 µm | | 0.83 to 0.87 s, 4.96 M |

The two columns are not the same surface: on the left every fibre thinner
than a voxel is as thick as one, on the right the axon has its 0.088 µm
throughout, so the tubes' triangle count hardly depends on the voxel (a
thinner tube has shorter edges around, and the *Tube aspect* counts in those).
On one thread 0.1 µm takes 2.1 s. What is left is serial for a
third: the plan (100 ms, 170 ms the first time, when the skeleton is smoothed)
and the merge (55 ms). The first build of a session takes about twice as long
as the ones in the table, which are warm.

The bundled cell in the browser at 0.1 µm, with the same settings
(Chromium 152, 12 workers, tab hidden, where builds run at one of two speeds;
best of 5):

| Voxel | Backend | Voxels throughout | Tubes and patches |
| --- | --- | --- | --- |
| 0.1 µm | cpu | 1 800 ms, 1.76 M triangles | 640 ms, 0.73 M |
| 0.1 µm | gpu | 1 200 ms | 430 ms |

This cell gains less, and less still at finer voxels (1.2 to 2 × at
0.0625 µm): its soma and the stems within the soma's band are a tenth of the
cable but a quarter of the voxel work, and the band of a thick neurite is a
volume, which grows with 1/voxel³ where the surface grows with 1/voxel².

### Voxels throughout

For the bundled cell (25 200 points, 27.6 mm of axon) with the default
smoothing and simplification (σ 1 µm, heavy axon smoothing, simplify at half a
voxel), no untangling, a blend of 0.5, the one-voxel radius floor and mesh
simplification at half a voxel, Node 24 on an Apple Silicon laptop (10
performance cores), one thread vs. `--workers 8` with warm workers:

| Voxel | Skeleton points | Triangles raw → simplified | Raw mesh | Simplified mesh |
| --- | --- | --- | --- | --- |
| 1.0 µm | 6 373 | 0.55 M → 0.07 M | 0.15 s → 0.12 s | 0.33 s → 0.10 s |
| 0.5 µm | 9 474 | 1.21 M → 0.14 M | 0.26 s → 0.14 s | 0.54 s → 0.11 s |
| 0.4 µm | 10 685 | 1.61 M → 0.18 M | 0.35 s → 0.12 s | 0.73 s → 0.15 s |
| 0.25 µm | 13 574 | 3.22 M → 0.32 M | 0.74 s → 0.22 s | 1.76 s → 0.24 s |

On one thread the field and the extraction cost about the same and the
simplification about twice either, which is why it runs per slab on the
workers. The skeleton simplify tolerance follows the voxel, so finer meshes
keep more points. `--no-simplify` keeps the raw mesh, `--raw` skips the
skeleton preparation and `--slab-voxels` sets the slab size.

The pool has one worker per core less one, less two from ten cores on, and
twelve at most: the projection neuron above takes 5.3 s on 8 workers, 4.4 s on
10 and 4.0 s on 12 of a 14-core machine, and the sample cell at 0.0625 µm goes
from 6.3 s to 4.7 s (cpu) and from 2.9 s to 2.3 s (gpu) in the browser.

Larger cells are cut into more slabs, up to four per worker. Small jobs stay
on one slab: below roughly 1 M band voxels the messaging costs more than the
threads save.

### With WebGPU

Same cell and settings in the browser (`/gpu-bench.html`, Chromium 152, M4 Pro:
10 performance cores and its integrated GPU), wall time of a whole build on 8
workers, median of 7, simplified mesh. *gpu-field* runs only the field on the
GPU and reads back the blocks the surface crosses; *gpu* also extracts there.

| Voxel | cpu | gpu-field | gpu |
| --- | --- | --- | --- |
| 1.0 µm | 55 ms | 41 ms | 37 ms |
| 0.5 µm | 112 ms | 77 ms | 66 ms |
| 0.25 µm | 263 ms | 165 ms | 139 ms |
| 0.16 µm | 714 ms | 454 ms | 397 ms |

At 0.25 µm the field drops from 690 ms of worker time to about 20 ms of
binning plus waiting, and the extraction from 380 ms to 110 ms (what is left is
the readback and the normals). The simplification, 650 ms of worker time, is
untouched and now makes up most of the build. With 2 workers instead of 8 the
same build goes from 840 ms to 473 ms, and without simplification from 292 ms
to 138 ms, where the single-threaded merge is what remains.

Measure with the tab visible: a hidden tab runs at background priority, which
slows the workers several times over and drowns the difference.


## Limitations

- With voxels throughout (the tubes off, or a build that fell back), there is
  one voxel size, and fibres thinner than a voxel are as thick as one. With the
  tubes on, a fibre is thicker than traced only inside a patch that refining
  would make too expensive (in practice the soma's, at voxels coarser than the
  default, and on the ramp out of it), and below a quarter of the voxel.
- Such a fibre is laid out at its traced radius and meshed at the patch's
  floor. Whatever passes it by closer than the difference, without belonging
  to the patch, is not blended with it and may touch it.
- A thin fibre at the default tolerance is a hexagonal prism. It shades round
  (the normals are the segments'), its vertices stand 7 % of the radius outside
  the surface and its faces come as far inside, and it has 95 % of the circle's
  area. Lower *Mesh simplify* for more vertices around.
- Tubes at their traced calibre have more triangles than thickened ones: the
  edges around a ring are shorter, and the *Tube aspect* spaces the rings by
  those. Raise it if a coarse voxel is meant to give a small mesh.
- The collars between patches and tubes keep the patch's vertices along the
  cut, which are denser and less even than a ring's.
- The surface is closed and consistently oriented. Cells where two separate
  sheets pass through the same voxel can still share a vertex or, very rarely,
  an edge (one edge in the 1.3 M-triangle sample at 0.5 µm), so it is
  watertight but not strictly 2-manifold there; refining the voxel size
  resolves them. The statistics count those edges, and say "closed surface ✓"
  only where there are none.
- Fibres that touch are welded, and tracings have them touch: the sample cell
  in 9 places at a blend of 0.5, a projection neuron in 17, most of them axons
  traced straight through a dendrite or another axon. The statistics give the
  count. Fibres that pass within a voxel of each other count as touching.
  Untangling (step 2) moves them apart instead. It leaves alone what it
  cannot tell from anatomy: the arms of a fold in one section, which lie
  against each other up to the turn, and sections of one fork or of the soma
  that cross while they still blend.
- The field dominates memory: about 6 bytes per sample in the band, 1.25 GB
  for a 249 000-point projection neuron at 0.4 µm. Slabs spread it over the
  workers, so the peak per worker is roughly that divided by the number of
  slabs.
- Simplification locks the vertices on slab seams, so a mesh cut into many
  slabs keeps a few percent more triangles than a single-slab run would.
- The GPU backend has been run on one GPU (Apple, Metal). It depends on the
  device giving the same result for the same shader and inputs in different
  dispatches; the POC's `gpu-bench.html?verify` checks a device against the CPU mesh.
  The tests run in Node, which has no WebGPU: they cover the binning (by
  replaying the shader's gather on the CPU), not the shaders. A slab of more
  than 65 535 blocks, or whose field exceeds the device's buffer limit, runs
  the field in batches and extracts on the CPU.

## Looks

All looks are built from three.js materials and procedural textures; no asset
files. Light rigs ride on the camera so the lighting stays put while orbiting.

| Look | What it is |
| --- | --- |
| Flat | Headlight plus sky light on a matte surface. The neutral baseline. |
| Studio | Three-point lighting: warm key, cool fill, rim light from behind. |
| Clay | Matcap shading from a procedural gradient: sculpted, lighting-independent, reads shape well. |
| Glossy | Clear-coated physical material reflecting a prefiltered procedural room. |
| Pearl | Physical material with velvet sheen and a bright rim under the same environment. |
| Toon | Four-step cel shading plus an inverted-hull outline 1.5 CSS pixels wide at any distance. |
| Depth cue | Matte shading with fog towards the background; the fog range follows the orbit distance so far branches always recede. |
| SEM | Scanning electron microscope: grayscale matcap with edges brighter than faces (the secondary-electron edge effect), detector grain, black field. Ignores type colours. |
| EM segmentation | A render of a segmented electron-microscopy volume: one matte, waxy grey for the whole cell, a lumpy membrane, occlusion in the creases, a dark field in either theme. Turns the bumps and the ambient occlusion on. Ignores type colours unless **Type tint** is on. |
| Fluorescence | Confocal-style projection: additive fresnel glow, GFP-green dendrites and soma, red axon, with a bloom pass. Overlapping fibres add up like a maximum-intensity projection. |
| Golgi | Golgi-Cox impregnation: an opaque dark neuron on a sepia slide with photographic grain. Ignores type colours. |
| Cajal | Ink drawing: screen-space cross-hatching that adds a second and third stroke direction as the shading darkens, plus a fresnel contour line. Sepia ink on paper; chalk on slate in the dark theme. |
| Cutaway | A clipping plane through the orbit target, facing the camera, removes everything nearer than the point you look at. Exposed back faces are drawn in a flat cut colour, so tubes read as hollow cross-sections. Pan to move the cut. |
| Depth-coded | A depth-coded maximum-intensity projection, as confocal stacks of whole neurons are published (Fiji's temporal-colour code): every fibre glows in the colour of its depth, red near through the spectrum to violet far, and where fibres overlap the brightest wins (blended by MAX). Ignores type colours. |
| Gold leaf | Polished gold on black lacquer, after the reflective microetchings of neurons: flakes of the leaf, fixed to the surface, catch the key light and go out as the cell turns. |

**EM segmentation** is how a cell looks in a segmented FlyWire, MICrONS or
Neuroglancer volume, not in a micrograph (that is the SEM look). Choosing it
turns on the bumps, at its own settings, and the ambient occlusion, which
stay on for the next look. It alone shades the bumps per pixel, so they show on
the long strips of a swept tube and on the soma's wide triangles, where the
per-vertex tilt of the other looks leaves them smooth or faceted; the tilt is
capped at 45° so that the far side of a bump never catches the rim light.

**Depth-coded** colours by the depth in front of the camera, so the colours
keep telling depth as the cell turns. Every frame the viewer takes the depths
of a sample of 16 k vertices and cuts them to 0.4 × the orbit distance either
side of the target: from afar the scale spans the cell, however shallow it is
along the view; close up it spreads over what lies around the target. The
flakes of **Gold leaf** sit in cubes fixed to the cell whose size follows the
pixel footprint: two sizes a power of two apart are mixed, so that the flakes
fade in and out rather than jump as the view zooms.

## Rendering

The mesh goes to the GPU once: positions as floats, normals as 16-bit and
colours as 8-bit normalised integers, 22 bytes per vertex. Every slab is its
own three.js mesh drawing its index range from the shared buffers, so slabs
outside the view are culled and nothing is duplicated. A frame is rendered
only when the camera moves or the scene changes, and the ambient occlusion
pass runs at half the device resolution.

**Bumps.** Every look's vertex shader roughens the surface: a vertex moves
along its shading normal by `height × radius × noise(position)`, and its
normal tilts with the noise's slope so the lighting follows the bumps. The
radius is a per-vertex attribute the build carries out of the mesher (a tube
vertex's ring, a patch vertex's closest section, a cut vertex's neighbour),
so the soma bumps most, a 0.2 µm axon barely, and the height never exceeds a
fifth of the radius. The noise is a gradient noise of the position with up to
three octaves, hashed on integer cells so it does not swim a millimetre from
the soma; the smoothness slider fades the finer octaves out, which is the
low-pass that makes the displacement read as a segmented surface rather than
as grain. The settings have a *Bumps* switch, off by default, and sliders under it for
height (× radius, 0.06 when turned on), scale (µm, 1.5) and smoothness (0.5),
all live without a build. The wireframe shows the bumped mesh, the
ambient-occlusion pass sees it, and the toon outline follows it. The exports
never include the bumps: they are a rendering, not a change to the mesh, and
the build's checks never see them.

In the platform, every look also declares what the neurite colours do in it (`Look.colors`: they colour it, tint it
while the type tint is on, or nothing), and Fluorescence and Depth-coded carry a key to their own colours
(`Look.legend`). There is no compare view.

## Cameras

The viewer opens orthographic, with a perspective camera to switch to (`camera.ts`). The switch keeps the orbit
target, the direction and how large the cell is at the target. The orthographic camera stays where the perspective
one was. Its zoom does not move it, so the fog, the cutaway plane and the depth-coded range take the view's `reach`:
the distance a perspective camera would need for the same view. The custom shaders take their view direction from
three's `isOrthographic`. On a switch the ambient-occlusion pass is pointed at the new camera and recompiled for its
projection. In the orthographic view the viewer reports µm per CSS pixel for the scale bar.

Switching to perspective keeps the size at the target, so a cell that reaches towards the camera can overflow the
frame there. *Reset view* fits it again, taking depth into account.

## Layout

```
swc.ts            SWC parser, section extraction, soma model
soma.ts           the soma sized from the first sample of each arbor: base sphere, neck targets, counts
prepare.ts        radius/path smoothing and polyline simplification
mesher.ts         slab planning, sparse field accumulation, surface nets, merge
field.ts          the field and its gradient at arbitrary points, from a slab's segments
refine.ts         projection of the vertices onto the field, checked simplification
untangle.ts       optional: move fibres apart where the tracing has them touch
kin.ts            which parts of the skeleton blend: stars around the forks, welds where fibres touch, shafts
segments.ts       closest points of two segments, and of a segment to a point; polyline arcs and chains, cell lists
growable.ts       typed arrays that grow, for the meshes the meshers build
classify.ts       which stretches of the skeleton are plain tubes, the patches around the rest and the voxel of each
tubes.ts          swept tubes: stations, rotation-minimising frames, rings cast onto the surface, caps
clip.ts           cutting a patch's closed mesh open at the planes where tubes take over
distances.ts      path distances to the soma, of mesh vertices and skeleton segments, for Colour by Distance
hybrid.ts         tubes + voxel patches: planning into batches, meshing a batch, merging with collars
gpu-slab.ts       WebGPU backend: segment binning, field / count / vertex / face / projection / check shaders, readback
protocol.ts       types and transfer lists shared by the pool and the workers
mesher-api.ts     what a worker exposes over Comlink: parse / plan / slab / merge, one call at a time
mesher.worker.ts  worker entry: exposes the mesher API
pool.ts           worker pool: task queue, cancellation of superseded builds, failed workers
viewer.ts         three.js scene: chunked mesh upload, looks, skeleton overlays, both cameras, AO and bloom passes
looks.ts          shading styles: materials, light rigs, procedural matcap / environment, bumps and width floor
colors.ts         neurite and distance colours written into the 8-bit vertex colours
camera.ts         orthographic / perspective equivalence, orthographic framing and pixel scale
framing.ts        camera framing around the soma, clip ranges, depth-coded range
```

The viewer around the engine (hooks, chrome, help cards, export) is described in [../README.md](../README.md).

Tests: `src/__tests__/cell-morphology/mesher/` (node environment), with the sample cell in
`src/__tests__/cell-morphology/fixtures/`.
