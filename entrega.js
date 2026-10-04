/* Oso Mates - cálculo de la fecha estimada de entrega.
   Lo usan las páginas de cada mate (producto.html / mate-*.html) y la campaña (campana.js).
   - Despacho en 1-2 días hábiles desde el pago + días de envío de la zona ("2-3 días hábiles").
   - Con grabado: 2-3 días hábiles para grabarlo (en lugar del despacho normal).
   - Mar del Plata (mismoDia): se entrega en el día; con grabado, el día que se termina.
   - Cuenta solo días hábiles (lun-vie, sin feriados). Si el pedido entra después de las 14 h
     o un día no hábil, se cuenta desde el siguiente día hábil. */
var ENTREGA={horaCorte:14, despachoMin:1, despachoMax:2,
  /* feriados de fecha fija (mes-día) */
  feriados:['01-01','03-24','04-02','05-01','05-25','06-20','07-09','12-08','12-25'],
  /* feriados que cambian de fecha cada año (año-mes-día) */
  feriadosFecha:['2026-10-12','2026-11-23']};
var GRABADO_DIAS=[2,3];
function esHabil(d){
  var dow=d.getDay(); if(dow===0||dow===6) return false;
  var md=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return ENTREGA.feriados.indexOf(md)===-1&&ENTREGA.feriadosFecha.indexOf(d.getFullYear()+'-'+md)===-1;
}
function sumarHabiles(d,n){
  var r=new Date(d.getFullYear(),d.getMonth(),d.getDate()), k=0;
  while(k<n){ r.setDate(r.getDate()+1); if(esHabil(r)) k++; }
  return r;
}
function rangoDias(txt){
  var m=/(\d+)\s*(?:-|a)\s*(\d+)/.exec(String(txt||'')); if(m) return [parseInt(m[1],10),parseInt(m[2],10)];
  var u=/(\d+)/.exec(String(txt||'')); return u?[parseInt(u[1],10),parseInt(u[1],10)]:null;
}
function fechaCorta(d,conMes){
  var dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  var meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return dias[d.getDay()]+' '+d.getDate()+(conMes?' de '+meses[d.getMonth()]:'');
}
function baseEntrega(ahora){
  var base=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  var tarde=!esHabil(base)||ahora.getHours()>=ENTREGA.horaCorte;
  if(tarde){ base=sumarHabiles(base,1); }
  return {base:base,tarde:tarde};
}
/* Devuelve {desde,hasta[,mismoDia]} o null si la zona no tiene días cargados */
function calcEntrega(z,ahora,grabado){
  ahora=ahora||new Date();
  var base=baseEntrega(ahora).base;
  if(z&&z.mismoDia){
    if(grabado) return {desde:sumarHabiles(base,GRABADO_DIAS[0]),hasta:sumarHabiles(base,GRABADO_DIAS[1])};
    return {desde:base,hasta:base,mismoDia:true};
  }
  var r=rangoDias(z&&z.days); if(!r) return null;
  return {desde:sumarHabiles(base,(grabado?GRABADO_DIAS[0]:ENTREGA.despachoMin)+r[0]),
          hasta:sumarHabiles(base,(grabado?GRABADO_DIAS[1]:ENTREGA.despachoMax)+r[1])};
}
/* Último día para pedir (antes de las 14 h) y que llegue seguro hasta "limite" inclusive.
   Con optimista=true usa el plazo más corto (puede llegar). Devuelve una fecha o null si ya no llega. */
function ultimoDiaPedido(z,grabado,limite,ahora,optimista){
  ahora=ahora||new Date();
  var hoy=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  var tope=new Date(limite.getFullYear(),limite.getMonth(),limite.getDate());
  var ultimo=null;
  for(var d=new Date(hoy); d<=tope; d.setDate(d.getDate()+1)){
    if(!esHabil(d)) continue;
    /* hoy cuenta solo si todavía no pasó la hora de corte */
    var momento=(d.getTime()===hoy.getTime())?ahora:new Date(d.getFullYear(),d.getMonth(),d.getDate(),10);
    if(d.getTime()===hoy.getTime()&&ahora.getHours()>=ENTREGA.horaCorte) continue;
    var e=calcEntrega(z,momento,grabado);
    if(e&&(optimista?e.desde:e.hasta)<=tope) ultimo=new Date(d);
  }
  return ultimo;
}
