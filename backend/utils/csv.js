// A value beginning with =, +, @, tab or carriage return is interpreted as a
// formula by Excel and Google Sheets when the CSV is opened. Quoting does not
// prevent it -- the cell is still evaluated -- so the value is prefixed with a
// single quote, which those applications treat as "literal text". Party names,
// descriptions and invoice numbers are user-supplied and reach this file, which
// makes it a formula-injection sink rather than a theoretical one.
const FORMULA_PREFIX=/^[=+@\t\r]/;
// A leading hyphen is the ambiguous case: it starts a formula for a human but
// is also how every negative amount is written. Numbers are left untouched so
// the exported figures stay byte-identical to what the app displays.
const PLAIN_NUMBER=/^-?\d+(?:\.\d+)?$/;

export function csvCell(value){
  let text=String(value??'');
  if(FORMULA_PREFIX.test(text))text=`'${text}`;
  else if(text.startsWith('-')&&!PLAIN_NUMBER.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

export function toCsv(rows){
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
