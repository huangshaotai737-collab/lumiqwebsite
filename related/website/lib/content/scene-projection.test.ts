import {describe,expect,it} from 'vitest';
import {orbSceneGeometry,sceneProjection,sceneTriangles} from './scene-projection';

// Validate each source corner against its independently measured photo location.
describe('device scene projection',()=>{
  for(const [scene,geometry] of Object.entries(orbSceneGeometry))for(const [layer,corners]of Object.entries(geometry)){
    it(`${scene} ${layer} maps all four corners without cropping the screen`,()=>{
      const [w,h]=layer==='screen'?[1920,1360]:[1112,678];
      const m=sceneProjection(w,h,corners).slice(9,-1).split(',').map(Number);
      [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],index)=>{
        const denominator=m[3]*x+m[7]*y+m[15];
        expect((m[0]*x+m[4]*y+m[12])/denominator).toBeCloseTo(corners[index][0],6);
        expect((m[1]*x+m[5]*y+m[13])/denominator).toBeCloseTo(corners[index][1],6);
      });
    });
  }
  it('rejects degenerate geometry',()=>expect(()=>sceneProjection(0,0,orbSceneGeometry.kitchen.screen)).toThrow('Invalid device screen geometry'));
});

describe('SVG screen projection',()=>{
  for(const [name,geometry] of Object.entries(orbSceneGeometry)) it(`${name} preserves every patch corner`,()=>{
    const tiles=sceneTriangles(1920,1360,geometry.screen);
    expect(tiles).toHaveLength(32);
    for(const tile of tiles){const[a,b,c,d,e,f]=tile.transform.slice(7,-1).split(' ').map(Number);
      tile.source.forEach(([x,y],index)=>{expect(a*x+c*y+e).toBeCloseTo(tile.target[index][0],6);expect(b*x+d*y+f).toBeCloseTo(tile.target[index][1],6);});
    }
  });
});
