export function classifyPerformanceEvent(text=""){
  const t=String(text||"");
  if(/ミュージカル|劇団|演劇|舞台|歌劇|宝塚/i.test(t)) return "theater";
  if(/落語|漫才|お笑い|コント|寄席|芸人/i.test(t)) return "comedy";
  if(/オーケストラ|交響楽団|フィルハーモニー|管弦楽|室内楽|リサイタル|クラシック/i.test(t)) return "classical";
  if(/フェス|FES|FEST|対バン|オムニバス/i.test(t)) return "multi_artist";
  return "music";
}

function clean(v=""){
  return String(v||"").replace(/^[\s　「『【（(]+|[\s　」』】）)]+$/g,"").replace(/\s+/g," ").trim();
}

export function extractPerformanceSubject({name="",title="",venueText=""}={}){
  const full=[venueText,title,name].filter(Boolean).join(" ");
  const event_type=classifyPerformanceEvent(full);

  const labeled=[
    ["theater_company",/(?:劇団|団体)\s*[:：]\s*([^|｜／/\n]{2,80})/i],
    ["performer",/(?:出演者?|出演|アーティスト|ARTIST)\s*[:：]\s*([^|｜／/\n]{2,100})/i]
  ];
  for(const [display_name_type,re] of labeled){
    const m=full.match(re);
    if(m){
      const display_name=clean(m[1]).split(/\s+(?:開場|開演|日時|会場|料金|チケット)/)[0].trim();
      if(display_name.length>=2) return {display_name,display_name_type,display_name_source:"explicit_label",event_type};
    }
  }

  const entity=(full.match(/(劇団四季|劇団☆新感線|NODA[・･.]?MAP|TEAM\s*NACS|宝塚歌劇団|[一-龠々ぁ-んァ-ヶA-Za-z0-9☆・･\- ]{2,30}(?:劇団|歌劇団|交響楽団|フィルハーモニー管弦楽団|フィルハーモニー))/i)||[])[1];
  if(entity){
    const display_name=clean(entity);
    const display_name_type=/劇団|歌劇団/i.test(display_name)?"theater_company":/交響楽団|フィルハーモニー/i.test(display_name)?"orchestra":"group";
    return {display_name,display_name_type,display_name_source:"named_entity",event_type};
  }

  const raw=clean(name||title);

  // "A GUEST: B" のような公演は先頭の主役を採る。
  const guestLead=raw.match(/^(.{2,60}?)\s+(?:GUEST|ゲスト)\s*[:：]/i);
  if(guestLead){
    return {display_name:clean(guestLead[1]),display_name_type:"performer",display_name_source:"guest_lead",event_type};
  }

  // "Aのコント..." "A 生誕祭" など、公演名に主役が埋め込まれている場合。
  const owner=raw.match(/^(.{2,40}?)(?:の| presents?\b|プレゼンツ)/i);
  if(owner && /落語|漫才|お笑い|コント|寄席|トーク|ライブ/i.test(raw)){
    return {display_name:clean(owner[1]),display_name_type:"performer",display_name_source:"title_owner",event_type};
  }
  const birthday=raw.match(/^(.{2,40}?)\s*(?:生誕祭|周年記念|記念公演)/);
  if(birthday){
    return {display_name:clean(birthday[1]),display_name_type:"performer",display_name_source:"title_owner",event_type};
  }

  if(event_type==="music"||event_type==="classical"||event_type==="multi_artist"){
    let display_name=raw
      .replace(/\s+20\d{2}\s+(?:LIVE|TOUR|CONCERT)\b[\s\S]*$/i,"")
      .replace(/\s+(?:LIVE|TOUR|CONCERT)\b[\s\S]*$/i,"")
      .replace(/\s+(?:ライブ|ツアー|コンサート|リサイタル)\b[\s\S]*$/,"")
      .trim();

    // 同じアーティスト名が先頭で重複しているケースを圧縮する。
    const dup=display_name.match(/^([^\s　]{2,30})[\s　]+\1(?:[\s　]+(.+))?$/);
    if(dup) display_name=clean(dup[1]+(dup[2]?" "+dup[2]:""));

    if(display_name.length>=2&&display_name.length<=80){
      return {display_name,display_name_type:event_type==="classical"?"ensemble":"artist",display_name_source:"title_prefix",event_type};
    }
  }

  let display_name=raw.split(/[「『【(（:：｜|／/]/)[0].trim()||raw;
  if(display_name.length>50) display_name=display_name.slice(0,50).trim();
  return {display_name:display_name||"公演",display_name_type:"event_subject",display_name_source:"title_fallback",event_type};
}
