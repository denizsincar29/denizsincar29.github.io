let chordlist=[];

function main(){
	initctrls()
	let select=document.getElementById('select_style');
	for (let i = 0; i<styles.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = styles[i];
		select.appendChild(opt);
	}

	select = document.getElementById('key_select');
	for (let i = 0; i<key_signatures_list.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = key_signatures[key_signatures_list[i]];
		select.appendChild(opt);
	}

	select = document.getElementById('select_ts');
	for (let i = 0; i<time_signatures_list.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = time_signatures[time_signatures_list[i]];
		select.appendChild(opt);
	}


	select = document.getElementById('selectkey');
	for (let i = 0; i<chordkeys.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = chordkeys[i];
		select.appendChild(opt);
	}
	select = document.getElementById('selectfn');
	// fnlist=Object.keys(fndict)
	for (let i = 0; i<fnlist.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = fndict[fnlist[i]];
		select.appendChild(opt);
	}
}
function enterchord(){
	let selects=[document.getElementById("selectkey"), document.getElementById("selectfn")];
	let indices=[selects[0].selectedIndex,selects[1].selectedIndex];
	let el=chordkeys[indices[0]]+" "+fntlist[indices[1]];
	select = document.getElementById('thelist');
	index=select.selectedIndex;
	chordlist.splice(index,0,[el]);
	select.innerHTML="";
	for (let i = 0; i<chordlist.length; i++){
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = chordlist[i];
		select.appendChild(opt);
	}
	let opt = document.createElement('option');
	opt.value = "end";
	opt.innerHTML = metadata["end"];
	select.appendChild(opt);

}
function initctrls(){
	labels=document.getElementsByTagName("label");
	btns=document.getElementsByTagName("button");
	document.getElementById("ending").innerHTML=metadata["end"];
	for(element of labels){element.innerHTML=metadata[element.id];}
	for(element of btns){element.innerHTML=metadata[element.id];}




}

document.addEventListener("DOMContentLoaded", main);
