/** A text edit must not reset playing media in the private editor canvas.
 * Ordinary website consumers retain their original adapter-identity dependency. */
export function visualMediaDependency<T extends {url:(original:string)=>string}>(adapter:T,visual:boolean,original:string):T|string{
 return visual?adapter.url(original):adapter;
}
