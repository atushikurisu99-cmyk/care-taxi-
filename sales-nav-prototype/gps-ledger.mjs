/* Taxi Sales Navi: deterministic GPS point deduplication and distance projection.
 * Pure module, no UI changes. Browser ES module.
 * Only high-quality consecutive observations contribute to observedKm.
 */
export function createGpsLedger() {
  const points = new Map();
  const key = p => String(p.pointId || [p.dutyId,p.recordedAt,p.latitude,p.longitude].join(':'));
  function add(p) {
    if (!p || !p.dutyId || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude)>90 || Math.abs(p.longitude)>180 || !Number.isFinite(Date.parse(p.recordedAt))) {
      return {accepted:false,reason:'invalid'};
    }
    const id=key(p);
    if (points.has(id)) return {accepted:false,reason:'duplicate'};
    points.set(id,{...p,pointId:id});
    return {accepted:true,id};
  }
  function meters(a,b) {
    const rad=Math.PI/180, dlat=(b.latitude-a.latitude)*rad,dlon=(b.longitude-a.longitude)*rad;
    const x=Math.sin(dlat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(x)));
  }
  function summarize(dutyId,{maxAccuracyM=25,maxGapSeconds=30,maxSpeedKmh=160}={}) {
    const rows=[...points.values()].filter(p=>p.dutyId===dutyId)
      .sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt)||a.pointId.localeCompare(b.pointId));
    let observedM=0,excluded=0,previous=null;
    for(const p of rows){
      if(previous){
        const dt=(Date.parse(p.recordedAt)-Date.parse(previous.recordedAt))/1000;
        const distance=meters(previous,p);
        const valid=dt>0&&dt<=maxGapSeconds&&
          Number.isFinite(p.accuracyM)&&Number.isFinite(previous.accuracyM)&&
          p.accuracyM<=maxAccuracyM&&previous.accuracyM<=maxAccuracyM&&
          distance/dt*3.6<=maxSpeedKmh;
        if(valid) observedM+=distance; else excluded++;
      }
      previous=p;
    }
    return {dutyId,pointCount:rows.length,observedKm:observedM/1000,excludedSegments:excluded,
      note:'Observed GPS distance only; not odometer distance or estimated missing distance'};
  }
  return {add,summarize,exportPoints:()=>[...points.values()]};
}
