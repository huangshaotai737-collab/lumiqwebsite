import {it,expect} from 'vitest';
import {editHistory,undoHistory,redoHistory,newHistory} from './editor-history';
it('coalesces typing, restores original value, and discards redo after a new edit',()=>{
 let history=newHistory();
 history=editHistory(history,'title','a','ab',1000);
 history=editHistory(history,'title','ab','abc',1200);
 expect(history.past).toHaveLength(1);
 const undo=undoHistory(history)!;expect(undo.value).toBe('a');
 const redo=redoHistory(undo.history)!;expect(redo.value).toBe('abc');
 expect(editHistory(undo.history,'body','old','new',2000).future).toHaveLength(0);
 expect(undoHistory(newHistory())).toBeNull();
});
