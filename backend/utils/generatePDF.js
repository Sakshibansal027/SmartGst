import PDFDocument from 'pdfkit';

const palette={green:'#16483A',bone:'#F3EFE4',red:'#DF5945',ink:'#26342E',muted:'#6F7D75',line:'#D9DDD5'};
const inr=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(value||0));
export function sendPdf(res,{filename,title,subtitle,meta=[],sections=[]}){
  res.status(200);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  const doc=new PDFDocument({size:'A4',margin:44,bufferPages:true});doc.pipe(res);
  const pageWidth=doc.page.width-doc.page.margins.left-doc.page.margins.right;
  doc.rect(0,0,doc.page.width,92).fill(palette.green);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('SmartGST',44,28);
  doc.font('Helvetica').fontSize(9).fillColor('#E6EFE9').text('COMPLIANCE REPORT · PROTOTYPE',44,54);
  doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(20).text(title,44,115,{width:pageWidth});
  doc.fillColor(palette.muted).font('Helvetica').fontSize(10).text(subtitle||'Prepared from saved SmartGST records. Not an officially filed GST return.',44,144,{width:pageWidth});
  let y=180;
  if(meta.length){for(const item of meta){doc.fillColor(palette.muted).fontSize(8).text(String(item.label).toUpperCase(),44,y);doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(10).text(String(item.value??'—'),44,y+13);y+=38;}y+=4;}
  for(const section of sections){
    if(y>doc.page.height-100){doc.addPage();y=48;}
    doc.fillColor(palette.green).font('Helvetica-Bold').fontSize(12).text(section.title,44,y);y+=22;
    const rows=section.rows||[];
    if(section.columns?.length){
      const widths=section.widths||section.columns.map(()=>pageWidth/section.columns.length);
      doc.rect(44,y,pageWidth,22).fill(palette.bone);let x=44;
      section.columns.forEach((col,i)=>{doc.fillColor(palette.green).font('Helvetica-Bold').fontSize(7).text(String(col).toUpperCase(),x+5,y+7,{width:widths[i]-10,ellipsis:true});x+=widths[i];});y+=22;
      for(const row of rows){if(y>doc.page.height-55){doc.addPage();y=48;}x=44;const height=26;row.forEach((cell,i)=>{doc.fillColor(palette.ink).font('Helvetica').fontSize(8).text(String(cell??''),x+5,y+7,{width:widths[i]-10,height:12,ellipsis:true});x+=widths[i];});doc.moveTo(44,y+height).lineTo(44+pageWidth,y+height).strokeColor(palette.line).lineWidth(.4).stroke();y+=height;}
    }else{
      for(const row of rows){doc.fillColor(palette.muted).font('Helvetica').fontSize(9).text(String(row[0]),44,y,{width:pageWidth*.65});doc.fillColor(palette.ink).font('Helvetica-Bold').text(String(row[1]),44+pageWidth*.65,y,{width:pageWidth*.35,align:'right'});y+=20;}
    }
    y+=20;
  }
  if(y>doc.page.height-65){doc.addPage();y=48;}
  doc.moveTo(44,doc.page.height-46).lineTo(doc.page.width-44,doc.page.height-46).strokeColor(palette.line).stroke();
  doc.fillColor(palette.muted).font('Helvetica').fontSize(8).text('Prototype report · Verify figures and tax applicability before use.',44,doc.page.height-35,{width:pageWidth});
  doc.end();
}
export {inr};
