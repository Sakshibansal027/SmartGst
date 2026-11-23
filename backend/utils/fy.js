export function fiscalYearRange(value){const match=/^(\d{4})-(\d{2})$/.exec(String(value||''));if(!match)return null;const start=Number(match[1]),end=Number(match[2]);if(end!==(start+1)%100)return null;return{from:`${start}-04-01`,to:`${start+1}-03-31`};}
export function dateRangeFilter(range){return range?{date:{$gte:range.from,$lte:range.to}}:{ };}
