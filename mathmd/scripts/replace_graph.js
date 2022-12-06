// graph extension emulator for showdown
// this is the graph emulator. it meens that in dynamic content it will just put a message instead of the graph, eg. in editor where realtime graphing is not supported.

function graphext(){
	return [{
		type: "output",
		filter: function(text, converter, options) {
			return text
				.replace(/{graph:(.*)}/gi,"<div class='graph'><strong>---------------<br>this is a graph of a function: `$1`</b></div>");
		}
	}
];}


// load the extension
showdown.extension("graphext",graphext);
