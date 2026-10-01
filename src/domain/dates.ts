const MONTHS:Record<string,number>={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12}
export function isoDate(day:number,month:string,year:number){const m=MONTHS[month.toLowerCase()];if(!m)return null;return `${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
export function addMonths(date:string,n:number){const [y,m,d]=date.split("-").map(Number);if(!y||!m||!d)return null;const dt=new Date(Date.UTC(y,m-1+n,d));return dt.toISOString().slice(0,10)}
export function validIsoDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"))}
