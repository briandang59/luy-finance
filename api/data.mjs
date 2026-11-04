import {requireSession} from '../lib/auth.mjs';
import {withGoogleIdentity} from '../lib/google-session.mjs';
import {body,json,fail,sameOrigin,HttpError} from '../lib/http.mjs';
import {applyOperation,replayEvents,validId,ModelError} from '../public/shared/model.js';
import {store} from '../lib/store.mjs';

export function dataHandler(storage = store) {
  return async (req,res) => withGoogleIdentity(req,async () => {
    try {
      requireSession(req);
      if (!['GET','POST'].includes(req.method)) throw new HttpError(405,'Phương thức không được hỗ trợ.');
      const events = await storage.read(), current = replayEvents(events);
      if (req.method === 'GET') return json(res,200,{state:current.state,conflicts:current.conflicts.length});
      sameOrigin(req);
      const input = await body(req);
      if (input?.action === 'sync') {await storage.sync(current.state);return json(res,200,{state:current.state});}
      if (!input || !validId(input.id) || !Number.isSafeInteger(input.expectedRevision)) throw new HttpError(400,'Yêu cầu lưu không hợp lệ.');
      const previous = events.find(e => e.id === input.id);
      if (previous) {
        if (previous.type !== input.type || JSON.stringify(previous.payload) !== JSON.stringify(input.payload)) throw new HttpError(409,'ID thao tác đã được dùng cho dữ liệu khác.');
        if (!current.applied.has(input.id)) throw new HttpError(409,'Có thay đổi đồng thời. Tải lại dữ liệu rồi thử lại.');
        return json(res,200,{state:current.state,retried:true});
      }
      if (input.expectedRevision !== current.state.revision) throw new HttpError(409,'Dữ liệu đã thay đổi ở tab hoặc thiết bị khác. Tải lại trước khi lưu.');
      const event = {id:input.id,at:new Date().toISOString(),type:input.type,payload:input.payload,baseRevision:input.expectedRevision};
      applyOperation(current.state,event);
      await storage.append(event);
      const latest = replayEvents(await storage.read());
      if (!latest.applied.has(event.id)) throw new HttpError(409,'Có thay đổi đồng thời. Thao tác này chưa được áp dụng; tải lại trước khi thử tiếp.');
      let projectionWarning = false;
      try {await storage.sync(latest.state);} catch {projectionWarning = true;}
      return json(res,200,{state:latest.state,projectionWarning});
    } catch (error) {fail(res,error instanceof ModelError ? new HttpError(422,error.message) : error);}
  });
}
export default dataHandler();
