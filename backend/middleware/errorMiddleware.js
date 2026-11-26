export function notFound(req,res){res.status(404).json({error:'API route not found.'});}
const uploadErrors={
  LIMIT_FILE_SIZE:'File is too large. Maximum size is 10 MB.',
  LIMIT_FILE_COUNT:'Upload one file at a time.',
  LIMIT_UNEXPECTED_FILE:error=>`Unexpected upload field${error.field?` "${error.field}"`:''}. Send the receipt as "file" — a JPG, PNG, WEBP image or PDF.`
};
function multerMessage(error){const message=uploadErrors[error.code];return typeof message==='function'?message(error):message||error.message;}
export function errorHandler(error,req,res,next){if(res.headersSent)return next(error);if(error.code===11000)return res.status(409).json({error:'That invoice number or email is already in use.'});if(error.name==='MulterError')return res.status(400).json({error:multerMessage(error)});console.error(error);return res.status(error.status||500).json({error:error.status?error.message:'The request could not be completed.'});}
