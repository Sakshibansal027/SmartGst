export function ok(res,data,status=200){return res.status(status).json(data);}
export function fail(res,status,message,extra={}){return res.status(status).json({error:message,...extra});}
