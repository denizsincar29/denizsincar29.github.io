let calcs=[];

// конфигурируем mathjax для показа математики
MathJax = {
  loader: {load: ['input/asciimath', 'output/chtml', 'ui/menu']},
};

function loadJS(FILE_URL, async = false, id=null) {
	let scriptEle = document.createElement("script");

	scriptEle.setAttribute("src", FILE_URL);
	scriptEle.setAttribute("type", "text/javascript");
	scriptEle.setAttribute("async", async);
	if(id!=null){scriptEle.setAttribute("id",id);}

	document.head.appendChild(scriptEle);

	// success event 
	scriptEle.addEventListener("load", () => {
		console.log("File loaded")
	});
	// error event
	scriptEle.addEventListener("error", (ev) => {
		console.log("Error on loading file", ev);
	});
}

loadJS("https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js",true,"MathJax-script");
loadJS("https://www.desmos.com/api/v1.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6");

window.onload= () => {
	targets=document.getElementsByTagName("graph");
	for(target of targets){
		let exp=target.innerHTML;
		target.innerHTML="";
		calcs.push(Desmos.GraphingCalculator(target,{}));
		calcs[calcs.length-1].setExpression({latex:exp});
	}
}
