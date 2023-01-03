function upbubble(x,y){
	let s=document.getElementById("svg");
	let hw=s.getBBox();
	// debug
	document.getElementById("xy").innerText=gyroscope.x +";"+gyroscope.y;

}

function main(){
	let gyroscope = new Gyroscope({frequency: 60});
	gyroscope.addEventListener('reading', e => {
		upbubble(gyroscope.x, gyroscope.y);
	});

gyroscope.start();}