// All tax arithmetic happens in whole paise and is only converted back to
// rupees at the end. Rounding each half of an intra-state split independently
// loses or invents a paise, which leaves a saved invoice whose CGST + SGST does
// not equal its GST, and a GSTR-1 summary whose rows do not add up to its own
// detail rows.
export function calculateTax(amount,rate,seller,buyer){
  const amountPaise=Math.round(Number(amount)*100);
  const gstPaise=Math.round(amountPaise*Number(rate)/100);
  const intra=String(seller).trim().toLowerCase()===String(buyer).trim().toLowerCase();
  // The odd paise goes to SGST deliberately, so CGST + SGST === GST by
  // construction. Indian GST permits the two halves to differ by one paise for
  // this reason.
  const cgstPaise=intra?Math.floor(gstPaise/2):0;
  const sgstPaise=intra?gstPaise-cgstPaise:0;
  const igstPaise=intra?0:gstPaise;
  return{taxable:amountPaise/100,rate:Number(rate),cgst:cgstPaise/100,sgst:sgstPaise/100,igst:igstPaise/100,gst:gstPaise/100,total:(amountPaise+gstPaise)/100,type:intra?'Intra-state':'Inter-state'};
}
