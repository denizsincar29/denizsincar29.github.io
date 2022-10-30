let chordlist=[[]];

function main(){
	initctrls()
	select = document.getElementById('selectkey');
	for (let i = 0; i<chordkeys.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = chordkeys[i];
		select.appendChild(opt);
	}
	select = document.getElementById('selectfn');
	fnlist=Object.keys(fndict)
	for (let i = 0; i<fnlist.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = fndict[fnlist[i]];
		select.appendChild(opt);
	}
}
function enterchord(){
	select = document.getElementById('thelist');
	index=select.selectedIndex
	chordlist.splice(index,0,[el]);
	select.innerHTML="";
	for (let i = 0; i<chordlist.length; i++){
		let opt = document.createElement('option');
		opt.value = i+1;
		opt.innerHTML = chordlist[i];
		select.appendChild(opt);
	}
}
function initctrls(){
	labels=document.getElementsByTagName("label");
	btns=document.getElementsByTagName("button");
	for(element of labels){element.innerHTML=metadata[element.id];}
	for(element of btns){element.innerHTML=metadata[element.id];}




}

document.addEventListener("DOMContentLoaded", main);
