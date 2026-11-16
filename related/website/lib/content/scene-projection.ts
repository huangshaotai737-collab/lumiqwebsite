/** Static perspective fit for real UI images inside photographed device screens.
 * Coordinates use a fixed 1448-pixel scene, so resizing never needs a render loop. */
export type SceneQuad = readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];

export function sceneProjection(width: number, height: number, corners: SceneQuad): string {
  const source = [[0, 0], [width, 0], [width, height], [0, height]];
  const rows = source.flatMap(([x, y], index) => {
    const [u, v] = corners[index];
    return [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]];
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    if (Math.abs(divisor) < 1e-10) throw new Error("Invalid device screen geometry");
    rows[column] = rows[column].map(value => value / divisor);
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const scale = rows[row][column];
      rows[row] = rows[row].map((value, index) => value - scale * rows[column][index]);
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map(row => row[8]);
  return `matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].join(",")})`;
}

export const orbSceneGeometry = {
  kitchen: {
    screen: [[200,446],[795,454],[848,824],[245,860]],
    frame: [[145,390],[828,405],[896,875],[188,927]],
  },
  closeup: {
    screen: [[223,199],[1140,214],[1213,820],[286,866]],
    frame: [[130,106],[1200,134],[1292,900],[199,974]],
  },
} as const;

/** Native SVG affine patches avoid WebKit's perspective-layer compositing bugs.
 * The source is fetched once and reused; geometry is calculated once, never per frame. */
export function sceneTriangles(width: number, height: number, corners: SceneQuad) {
  const matrix = sceneProjection(width, height, corners).slice(9, -1).split(",").map(Number);
  const project = ([x, y]: number[]) => {
    const divisor = matrix[3] * x + matrix[7] * y + matrix[15];
    return [(matrix[0] * x + matrix[4] * y + matrix[12]) / divisor, (matrix[1] * x + matrix[5] * y + matrix[13]) / divisor];
  };
  const tiles = [];
  for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
    const x = column * width / 4, y = row * height / 4, right = x + width / 4, bottom = y + height / 4;
    for (const source of [[[x,y],[right,y],[right,bottom]], [[x,y],[right,bottom],[x,bottom]]]) {
      const target = source.map(project);
      const [p,q,r] = source, [a,b,c] = target;
      const dx1=q[0]-p[0], dy1=q[1]-p[1], dx2=r[0]-p[0], dy2=r[1]-p[1], det=dx1*dy2-dx2*dy1;
      const ax=((b[0]-a[0])*dy2-(c[0]-a[0])*dy1)/det, cx=(dx1*(c[0]-a[0])-dx2*(b[0]-a[0]))/det;
      const by=((b[1]-a[1])*dy2-(c[1]-a[1])*dy1)/det, dy=(dx1*(c[1]-a[1])-dx2*(b[1]-a[1]))/det;
      const center = [target.reduce((n,v)=>n+v[0],0)/3,target.reduce((n,v)=>n+v[1],0)/3];
      // Subpixel overlap removes antialiasing seams between adjacent patches.
      const clip = target.map(([u,v]) => { const distance=Math.hypot(u-center[0],v-center[1]); return [u+(u-center[0])*.25/distance,v+(v-center[1])*.25/distance].join(","); }).join(" ");
      tiles.push({source, target, clip, transform:`matrix(${ax} ${by} ${cx} ${dy} ${a[0]-ax*p[0]-cx*p[1]} ${a[1]-by*p[0]-dy*p[1]})`});
    }
  }
  return tiles;
}
