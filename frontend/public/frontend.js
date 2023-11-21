let httpRequest;

document.getElementById("user1_button").addEventListener("Explore a professor's courses", handleUser1Button);
document.getElementById("user2_button").addEventListener("Find out the best professor to take a course with", handleUser2Button);

let inputbtn = document.getElementById("input")
function handleUser1Button() {
	let name  = inputbtn.innerText;
	let baseURI = "http://dfghj/courses/profs/alex"
	// httpRequest = new XMLHttpRequest();
	// httpRequest.send( {
	//
	//
	// 	`${baseURI}/${name}`
	// })
	// httpRequest.open("GET", "/style.css");
	//httpRequest.send();
}

function handleUser2Button() {
	//alert("");
}
