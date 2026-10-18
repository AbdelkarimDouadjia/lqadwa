// Shared by the D1 repository and the local SQLite benchmark. No patient GPS input.
export const publicPharmacyColumns = 'id,name,address,city,latitude,longitude,phone,duty,hours';
// shortcut: the country envelope catches impossible pins, not wrong-wilaya pins; use verified boundary polygons for exact commune validation.
const algeria = { south: 18.9, north: 37.2, west: -8.7, east: 12 };
export const inAlgeriaBounds = (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= algeria.south && latitude <= algeria.north && longitude >= algeria.west && longitude <= algeria.east;
const algeriaCoordinateFilter = `latitude BETWEEN ${algeria.south * 1e6} AND ${algeria.north * 1e6} AND longitude BETWEEN ${algeria.west * 1e6} AND ${algeria.east * 1e6}`;

/**
 * @param {{city:string,lat:number,lng:number,night:boolean,limit:number,excluded:string[],after?:{score:number,id:string},radiusKm?:number}} options
 */
export function discoveryQuery(options) {
  const {city,lat,lng,night,limit,excluded,after,radiusKm}=options;
  // Match the legacy wilaya-center distance, with a stable ID tie breaker.
  const score='(latitude-?)*(latitude-?) + ?*(longitude-?)*(longitude-?)';
  const parameters=[lat*1e6,lat*1e6,Math.cos(lat*Math.PI/180)**2,lng*1e6,lng*1e6,city,...excluded];
  const predicates=[];
  if(after){predicates.push('(score > ? OR (score = ? AND id > ?))');parameters.push(after.score,after.score,after.id);}
  if(radiusKm!==undefined){predicates.push('score <= ?');parameters.push((radiusKm/111*1e6)**2);}
  parameters.push(limit);
  return {
    sql:`WITH candidates AS (SELECT ${publicPharmacyColumns},${score} AS score FROM registered_pharmacies WHERE city=? AND status='approved' AND ${algeriaCoordinateFilter} ${night?'AND duty=1':''} ${excluded.length?`AND id NOT IN (${excluded.map(()=>'?').join(',')})`:''}) SELECT * FROM candidates ${predicates.length?'WHERE '+predicates.join(' AND '):''} ORDER BY score,id LIMIT ?`,
    parameters,
  };
}
