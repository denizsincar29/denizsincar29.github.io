// a javascript that converts any given markdown to html (with ascii math). after conversion, you can load mathjax to convert that into math.
// markdown can be fetched from whereever you want

//load showdown module
// https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0

// check if graph extension is loaded:
let defined_graph = (typeof graphext !=="undefined");


// make a showdown extension that interprets packtick (ascii math delimiter) literary, but works like a code block
function mathext(){
	return [{
		type: "output",
		filter: function(text, converter, options) {
			return text
				.replaceAll("<p><code>","`").replaceAll("</p></code>","`")
				.replaceAll("<code>","`").replaceAll("</code>","`") // replaceAlld back to backtick
				.replaceAll("¨D","$") // replaceAlld the dollar string to dollar, because markdown replaceAlls dollar to trema+D
				;
				// add more replaceAllments here, for more compatibilities with mathjax
		}
	}
];}

let extensions=["mathext"];
// load the extension
showdown.extension("mathext",mathext);
// if defined graph.js, than we load the extension graphext also.
if(defined_graph){
	showdown.extension("graphext",graphext);
	extensions.push("graphext");
}

// create a converter
let converter = new showdown.Converter({extensions: extensions});

// make a function to fetch a markdown from the url that is given in parameters
function fetchmd(){
	let url=decodeURI(location.search.slice(1));
	// we got the parameters from the request. now lets fetch the url
	fetch("./md/"+url+".md")
		.then(response => response.text())
		.then(result => mathmd(result))
.then(MathJax.typesetPromise);
}

// make a function to convert markdown to html with pre-configured extension
function mathmd(md){
document.getElementById("mathmd").innerHTML=converter.makeHtml(md); // make md
}

// convert a ready markdown string to html, without fetching. however fetch functionality is present.
// convert a markdown string to html

fetchmd();
