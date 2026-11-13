/** Copy updates must not reset playing media in previews or the public site. */
export function visualMediaDependency(adapter:{url:(original:string)=>string},original:string):string{
 return adapter.url(original);
}
