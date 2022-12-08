// graph extension for showdown

// we want to have great and accessible graphs in mathjax, so create an empty array of desmos objects:
let calcs=[];

function graphext(){
	return [{
		type: "output",
		filter: function(text, converter, options) {
			return text
				.replaceAll(/{graph:(.*)}/gi,"<div class='graph'>$1</div>")
				;
				// add more replaceAllments here, for more compatibilities with mathjax
		}
	}
];}


// load the extension
showdown.extension("graphext",graphext);

window.onload= () => {
	targets=document.getElementsByClassName("graph");
	for(target of targets){
		let exp=target.innerHTML;
		target.innerHTML="";
		calcs.push(Desmos.GraphingCalculator(target,{}));
		calcs[calcs.length-1].setExpression({latex:exp});
	}
}
