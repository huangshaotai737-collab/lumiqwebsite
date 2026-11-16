type Edit={path:string;before:unknown;after:unknown;at:number};
export type EditorHistory={past:Edit[];future:Edit[]};
export const newHistory=():EditorHistory=>({past:[],future:[]});
export function editHistory(history:EditorHistory,path:string,before:unknown,after:unknown,at=Date.now()):EditorHistory{
 if(JSON.stringify(before)===JSON.stringify(after))return history;
 const past=history.past.slice(),previous=past.at(-1);
 if(previous?.path===path&&at-previous.at<650&&!history.future.length)past[past.length-1]={...previous,after:structuredClone(after),at};
 else past.push({path,before:structuredClone(before),after:structuredClone(after),at});
 return {past:past.slice(-40),future:[]};
}
export function undoHistory(history:EditorHistory){const edit=history.past.at(-1);return edit?{path:edit.path,value:edit.before,history:{past:history.past.slice(0,-1),future:[...history.future,edit]}}:null;}
export function redoHistory(history:EditorHistory){const edit=history.future.at(-1);return edit?{path:edit.path,value:edit.after,history:{past:[...history.past,{...edit,at:0}],future:history.future.slice(0,-1)}}:null;}
